import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { overtimeBatchSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { formatDate } from '@/lib/utils/db-helpers';
import { UserRole } from '@/lib/types';

function parseTimeToDate(dateStr: string, timeStr: string) {
  // Ensure timeStr has HH:MM or HH:MM:SS
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return new Date(`${dateStr}T${t}`);
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const validated = overtimeBatchSchema.parse(body);

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

    // Create a single overtime request (header)
    const resOt = await query(
      'INSERT INTO overtime (employeeId, reason, status, total_seconds, total_hours) VALUES (?, ?, ?, ?, ?)',
      [validated.employeeId, validated.reason, 'pending', 0, 0]
    ) as any;

    const overtimeId = resOt.insertId;
    const insertedDayIds: number[] = [];
    let grandSeconds = 0;

    for (const day of validated.days) {
      // validate slots and compute total seconds
      let totalSeconds = 0;
      for (const slot of day.slots) {
        const start = parseTimeToDate(day.date, slot.start);
        const end = parseTimeToDate(day.date, slot.end);
        if (!(start instanceof Date) || !(end instanceof Date) || isNaN(start.getTime()) || isNaN(end.getTime())) {
          return createErrorResponse('Thời gian không hợp lệ', 400);
        }
        if (end <= start) {
          return createErrorResponse('Thời điểm kết thúc phải sau thời điểm bắt đầu', 400);
        }
        totalSeconds += Math.floor((end.getTime() - start.getTime()) / 1000);
      }

      // Insert day
      const dayRes = await query(
        'INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)',
        [overtimeId, formatDate(day.date)!, totalSeconds]
      ) as any;
      const dayId = dayRes.insertId;
      insertedDayIds.push(dayId);
      grandSeconds += totalSeconds;

      // Insert slots
      for (const slot of day.slots) {
        const start = parseTimeToDate(day.date, slot.start);
        const end = parseTimeToDate(day.date, slot.end);
        const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        const startTime = slot.start.length === 5 ? slot.start + ':00' : slot.start;
        const endTime = slot.end.length === 5 ? slot.end + ':00' : slot.end;
        await query(
          'INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)',
          [dayId, startTime, endTime, seconds]
        );
      }
    }

    // Update overtime aggregates
    const hours = Math.round((grandSeconds / 3600) * 100) / 100;
    await query('UPDATE overtime SET total_seconds = ?, total_hours = ? WHERE id = ?', [grandSeconds, hours, overtimeId]);

    return createSuccessResponse({ overtimeId, insertedDayIds }, 'Tạo đơn ngoài giờ thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/overtime/batch:', error);
    return createErrorResponse(error.message || 'Lỗi tạo đơn ngoài giờ nhiều ngày', 500);
  }
}