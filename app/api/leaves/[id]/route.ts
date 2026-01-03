import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { leaveSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';
import { differenceInDays } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const leaves = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const leaveList = Array.isArray(leaves) ? leaves : [leaves];

    if (!leaveList || leaveList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    // Employees can only see their own
    if (user.role === UserRole.EMPLOYEE && user.employeeId !== leaveList[0].employeeId) {
      return createErrorResponse('Không có quyền truy cập', 403);
    }

    return createSuccessResponse(leaveList[0]);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in GET /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin nghỉ phép', 500);
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

    const [existing] = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    const existingLeave = (existing as any[])[0];

    // Employees can only update pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingLeave.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền cập nhật', 403);
      }
      if (existingLeave.status !== 'pending') {
        return createErrorResponse('Chỉ có thể cập nhật đơn đang chờ duyệt', 400);
      }
      const validated = leaveSchema.parse(body);
      const startDate = new Date(validated.startDate);
      const endDate = new Date(validated.endDate);
      if (endDate < startDate) {
        return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
      }
      const days = differenceInDays(endDate, startDate) + 1;
      await query(
        'UPDATE leaves SET type = ?, startDate = ?, endDate = ?, days = ?, reason = ? WHERE id = ?',
        [
          validated.type,
          formatDate(validated.startDate)!,
          formatDate(validated.endDate)!,
          days,
          validated.reason,
          id,
        ]
      );
    } else {
      // Managers/HR/Admin can approve/reject
      if (body.status && ['approved', 'rejected'].includes(body.status)) {
        await query(
          'UPDATE leaves SET status = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
          [body.status, user.userId, id]
        );
      } else {
        const validated = leaveSchema.parse(body);
        const startDate = new Date(validated.startDate);
        const endDate = new Date(validated.endDate);
        if (endDate < startDate) {
          return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
        }
        const days = differenceInDays(endDate, startDate) + 1;
        await query(
          'UPDATE leaves SET type = ?, startDate = ?, endDate = ?, days = ?, reason = ? WHERE id = ?',
          [
            validated.type,
            formatDate(validated.startDate)!,
            formatDate(validated.endDate)!,
            days,
            validated.reason,
            id,
          ]
        );
      }
    }

    const updated = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    return createSuccessResponse(updatedList[0], 'Cập nhật đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in PUT /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật đơn nghỉ phép', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const existing = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    if (!existingList || existingList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    const existingLeave = existingList[0];

    // Employees can only delete pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingLeave.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền xóa', 403);
      }
      if (existingLeave.status !== 'pending') {
        return createErrorResponse('Chỉ có thể xóa đơn đang chờ duyệt', 400);
      }
    }

    await query('DELETE FROM leaves WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in DELETE /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa đơn nghỉ phép', 500);
  }
}

