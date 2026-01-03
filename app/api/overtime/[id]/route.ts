import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { overtimeSchema, idSchema } from '@/lib/utils/validation';
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

    return createSuccessResponse(otList[0]);
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

    const [existing] = await query('SELECT * FROM overtime WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      return createErrorResponse('Không tìm thấy đơn ngoài giờ', 404);
    }

    const existingOt = (existing as any[])[0];

    // Employees can only update pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingOt.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền cập nhật', 403);
      }
      if (existingOt.status !== 'pending') {
        return createErrorResponse('Chỉ có thể cập nhật đơn đang chờ duyệt', 400);
      }
      const validated = overtimeSchema.parse(body);
      await query(
        'UPDATE overtime SET date = ?, hours = ?, reason = ? WHERE id = ?',
        [formatDate(validated.date)!, validated.hours, validated.reason, id]
      );
    } else {
      // Managers/HR/Admin can approve/reject
      if (body.status && ['approved', 'rejected'].includes(body.status)) {
        await query(
          'UPDATE overtime SET status = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
          [body.status, user.userId, id]
        );
      } else {
        const validated = overtimeSchema.parse(body);
        await query(
          'UPDATE overtime SET date = ?, hours = ?, reason = ? WHERE id = ?',
          [formatDate(validated.date)!, validated.hours, validated.reason, id]
        );
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

