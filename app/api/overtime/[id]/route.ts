import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { overtimeSchema, idSchema, overtimeBatchSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const overtimes = await query('SELECT * FROM overtime WHERE id = ?', [id]);
    const otList = Array.isArray(overtimes) ? overtimes : [overtimes];

    if (!otList || otList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn ngoài giờ', 404);
    }

    // Employees can only see their own
    if (user.role === UserRole.EMPLOYEE && user.employeeId !== otList[0].employeeId) {
      return createErrorResponse('Không có quyền truy cập', 403);
    }

    const ot = otList[0] as any;

    // Attach days and slots
    const days = await query('SELECT * FROM overtime_days WHERE overtimeId = ?', [ot.id]);
    const dayIds = Array.isArray(days) ? days.map((d: any) => d.id) : [];
    let slots: any[] = [];
    if (dayIds.length > 0) {
      slots = await query('SELECT * FROM overtime_slots WHERE dayId IN (?)', [dayIds]) as any[];
    }
    const slotMap = new Map<number, any[]>();
    (Array.isArray(slots) ? slots : []).forEach((s: any) => {
      const arr = slotMap.get(s.dayId) || [];
      arr.push(s);
      slotMap.set(s.dayId, arr);
    });
    (Array.isArray(days) ? days : []).forEach((d: any) => {
      d.slots = slotMap.get(d.id) || [];
    });
    ot.days = days;

    return createSuccessResponse(ot);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in GET /api/overtime/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin ngoài giờ', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();

    const existing = await query('SELECT * FROM overtime WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    if (!existingList || existingList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn ngoài giờ', 404);
    }

    const existingOt = existingList[0];

    // Employees can only update pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingOt.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền cập nhật', 403);
      }
      if (existingOt.status !== 'pending') {
        return createErrorResponse('Chỉ có thể cập nhật đơn đang chờ duyệt', 400);
      }
      // Employee can update either legacy date/hours or provide days structure
      if (body.days) {
        // validate
        overtimeBatchSchema.parse({ employeeId: existingOt.employeeId, reason: body.reason || existingOt.reason, days: body.days });
        // replace days
        await query('DELETE FROM overtime_days WHERE overtimeId = ?', [id]);
        let grand = 0;
        for (const day of body.days) {
          let daySum = 0;
          for (const slot of day.slots) {
            const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
            const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
            const startSec = sh * 3600 + sm * 60;
            const endSec = eh * 3600 + em * 60;
            if (endSec <= startSec) return createErrorResponse('Thời điểm kết thúc phải sau thời điểm bắt đầu', 400);
            daySum += endSec - startSec;
          }
          const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [id, formatDate(day.date)!, daySum]) as any;
          const dayId = dayRes.insertId;
          for (const slot of day.slots) {
            const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
            const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
            const seconds = (eh * 3600 + em * 60) - (sh * 3600 + sm * 60);
            await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayId, slot.start + ':00', slot.end + ':00', seconds]);
          }
          grand += daySum;
        }
        const hours = Math.round((grand / 3600) * 100) / 100;
        await query('UPDATE overtime SET total_seconds = ?, total_hours = ?, reason = ? WHERE id = ?', [grand, hours, body.reason || existingOt.reason, id]);
      } else {
        const validated = overtimeSchema.parse(body);
        // legacy update: overwrite single date/hours and replace days with a single day/slot
        const seconds = Math.round(validated.hours * 3600);
        await query('UPDATE overtime SET date = ?, hours = ?, reason = ?, total_seconds = ?, total_hours = ? WHERE id = ?', [formatDate(validated.date)!, validated.hours, validated.reason, seconds, Math.round(validated.hours * 100) / 100, id]);
        await query('DELETE FROM overtime_days WHERE overtimeId = ?', [id]);
        const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [id, formatDate(validated.date)!, seconds]) as any;
        const endH = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const endM = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const endS = (seconds % 60).toString().padStart(2, '0');
        const endTimeStr = `${endH}:${endM}:${endS}`;
        await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayRes.insertId, '00:00:00', endTimeStr, seconds]);
      }
    } else {
      // Managers/HR/Admin can approve/reject
      if (body.status && ['approved', 'rejected'].includes(body.status)) {
        await query(
          'UPDATE overtime SET status = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
          [body.status, user.userId, id]
        );
      } else if (body.days) {
        // validate
        overtimeBatchSchema.parse({ employeeId: existingOt.employeeId, reason: body.reason || existingOt.reason, days: body.days });
        // update reason and replace days
        await query('DELETE FROM overtime_days WHERE overtimeId = ?', [id]);
        let grand = 0;
        for (const day of body.days) {
          let daySum = 0;
          for (const slot of day.slots) {
            const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
            const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
            const startSec = sh * 3600 + sm * 60;
            const endSec = eh * 3600 + em * 60;
            if (endSec <= startSec) return createErrorResponse('Thời điểm kết thúc phải sau thời điểm bắt đầu', 400);
            daySum += endSec - startSec;
          }
          const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [id, formatDate(day.date)!, daySum]) as any;
          const dayId = dayRes.insertId;
          for (const slot of day.slots) {
            const [sh, sm] = slot.start.split(':').map((v: string) => parseInt(v, 10));
            const [eh, em] = slot.end.split(':').map((v: string) => parseInt(v, 10));
            const seconds = (eh * 3600 + em * 60) - (sh * 3600 + sm * 60);
            await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayId, slot.start + ':00', slot.end + ':00', seconds]);
          }
          grand += daySum;
        }
        const hours = Math.round((grand / 3600) * 100) / 100;
        await query('UPDATE overtime SET total_seconds = ?, total_hours = ?, reason = ? WHERE id = ?', [grand, hours, body.reason || existingOt.reason, id]);
      } else {
        const validated = overtimeSchema.parse(body);
        // legacy update path
        const seconds = Math.round(validated.hours * 3600);
        await query('UPDATE overtime SET date = ?, hours = ?, reason = ?, total_seconds = ?, total_hours = ? WHERE id = ?', [formatDate(validated.date)!, validated.hours, validated.reason, seconds, Math.round(validated.hours * 100) / 100, id]);
        await query('DELETE FROM overtime_days WHERE overtimeId = ?', [id]);
        const dayRes = await query('INSERT INTO overtime_days (overtimeId, date, total_seconds) VALUES (?, ?, ?)', [id, formatDate(validated.date)!, seconds]) as any;
        const endH = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const endM = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const endS = (seconds % 60).toString().padStart(2, '0');
        const endTimeStr = `${endH}:${endM}:${endS}`;
        await query('INSERT INTO overtime_slots (dayId, start_time, end_time, seconds) VALUES (?, ?, ?, ?)', [dayRes.insertId, '00:00:00', endTimeStr, seconds]);
      }
    }

    const updated = await query('SELECT * FROM overtime WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    return createSuccessResponse(updatedList[0], 'Cập nhật đơn ngoài giờ thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in PUT /api/overtime/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật đơn ngoài giờ', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const existing = await query('SELECT * FROM overtime WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    if (!existingList || existingList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn ngoài giờ', 404);
    }

    const existingOt = existingList[0];

    // Employees can only delete pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingOt.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền xóa', 403);
      }
      if (existingOt.status !== 'pending') {
        return createErrorResponse('Chỉ có thể xóa đơn đang chờ duyệt', 400);
      }
    }

    await query('DELETE FROM overtime WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa đơn ngoài giờ thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in DELETE /api/overtime/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa đơn ngoài giờ', 500);
  }
}

