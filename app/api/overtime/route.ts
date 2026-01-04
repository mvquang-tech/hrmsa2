import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { overtimeSchema, overtimeBatchSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Overtime, UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    // Employees can only see their own overtime
    let whereClause = '';
    let whereParams: any[] = [];
    if (user.role === UserRole.EMPLOYEE && user.employeeId) {
      whereClause = 'employeeId = ?';
      whereParams = [user.employeeId];
    }

    const result = await paginate<Overtime>('overtime', params, whereClause, whereParams);

    // Attach days and slots for each overtime in the page
    const ids = result.data.map((r) => r.id);
    if (ids.length > 0) {
      const days = await query('SELECT * FROM overtime_days WHERE overtimeId IN (?)', [ids]);
      const dayIds = Array.isArray(days) ? days.map((d: any) => d.id) : [];
      let slots: any[] = [];
      if (dayIds.length > 0) {
        slots = await query('SELECT * FROM overtime_slots WHERE dayId IN (?)', [dayIds]) as any[];
      }

      // group slots by dayId
      const slotMap = new Map<number, any[]>();
      (Array.isArray(slots) ? slots : []).forEach((s: any) => {
        const arr = slotMap.get(s.dayId) || [];
        arr.push(s);
        slotMap.set(s.dayId, arr);
      });

      const dayMap = new Map<number, any[]>();
      (Array.isArray(days) ? days : []).forEach((d: any) => {
        const sd = slotMap.get(d.id) || [];
        d.slots = sd;
        const arr = dayMap.get(d.overtimeId) || [];
        arr.push(d);
        dayMap.set(d.overtimeId, arr);
      });

      result.data = result.data.map((r) => ({ ...r, days: dayMap.get(r.id) || [] }));
    }

    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/overtime:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách ngoài giờ', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();

    // Determine whether this is a days-based (batch) create or legacy single-date create
    let validated: any;
    let isDaysBased = false;
    if (body.days) {
      validated = (overtimeBatchSchema.parse(body) as any);
      isDaysBased = true;
    } else {
      validated = overtimeSchema.parse(body);
    }

    // Employees can only create for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || validated.employeeId !== user.employeeId) {
        return createErrorResponse('Bạn chỉ có thể tạo đơn ngoài giờ cho chính mình', 403);
      }
    }

    // Check employee exists
    const empCheck = await query('SELECT id FROM employees WHERE id = ?', [validated.employeeId]);
    if (!Array.isArray(empCheck) || empCheck.length === 0) {
      return createErrorResponse('Nhân viên không tồn tại', 400);
    }

    // Support either single-date legacy create or days-based create
    if (isDaysBased) {
      // If body includes days, create header + days/slots
      const resOt = await query(
        'INSERT INTO overtime (employeeId, reason, status, total_seconds, total_hours) VALUES (?, ?, ?, ?, ?)',
        [validated.employeeId, validated.reason, 'pending', 0, 0]
      ) as any;
      const overtimeId = resOt.insertId;
      let grandSeconds = 0;

      for (const day of (validated as any).days) {
        let totalSeconds = 0;
        for (const slot of day.slots) {
          const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
          const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
          const startSec = sh * 3600 + sm * 60;
          const endSec = eh * 3600 + em * 60;
          if (endSec <= startSec) return createErrorResponse('Thời điểm kết thúc phải sau thời điểm bắt đầu', 400);
          totalSeconds += endSec - startSec;
        }
        const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [overtimeId, formatDate(day.date)!, totalSeconds]) as any;
        const dayId = dayRes.insertId;
        for (const slot of day.slots) {
          const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
          const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
          const seconds = (eh * 3600 + em * 60) - (sh * 3600 + sm * 60);
          await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayId, slot.start + ':00', slot.end + ':00', seconds]);
        }
        grandSeconds += totalSeconds;
      }

      const hours = Math.round((grandSeconds / 3600) * 100) / 100;
      await query('UPDATE overtime SET total_seconds = ?, total_hours = ? WHERE id = ?', [grandSeconds, hours, overtimeId]);

      // Return the new overtime
      const newOvertime = await query('SELECT * FROM overtime WHERE id = ?', [overtimeId]);
      const otList = Array.isArray(newOvertime) ? newOvertime : [newOvertime];
      return createSuccessResponse(otList[0], 'Tạo đơn ngoài giờ thành công');
    }

    // legacy single-date create (backwards compatible)
    const seconds = Math.round(validated.hours * 3600);
    const totalHoursRounded = Math.round(validated.hours * 100) / 100;

    const result = await query(
      'INSERT INTO overtime (employeeId, date, hours, reason, status, total_seconds, total_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [validated.employeeId, formatDate(validated.date)!, validated.hours, validated.reason, 'pending', seconds, totalHoursRounded]
    ) as any;

    // Also create corresponding day/slot to preserve structure
    const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [result.insertId, formatDate(validated.date)!, seconds]) as any;
    const endH = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const endM = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const endS = (seconds % 60).toString().padStart(2, '0');
    const endTimeStr = `${endH}:${endM}:${endS}`;
    await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayRes.insertId, '00:00:00', endTimeStr, seconds]);

    const newOvertime = await query('SELECT * FROM overtime WHERE id = ?', [result.insertId]);
    const otList = Array.isArray(newOvertime) ? newOvertime : [newOvertime];
    return createSuccessResponse(otList[0], 'Tạo đơn ngoài giờ thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/overtime:', error);
    return createErrorResponse(error.message || 'Lỗi tạo đơn ngoài giờ', 500);
  }
}

