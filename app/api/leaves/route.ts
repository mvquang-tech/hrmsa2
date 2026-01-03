import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { leaveSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Leave, UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';
import { differenceInDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    // Employees can only see their own leaves
    let whereClause = '';
    let whereParams: any[] = [];
    if (user.role === UserRole.EMPLOYEE && user.employeeId) {
      whereClause = 'employeeId = ?';
      whereParams = [user.employeeId];
    }

    const result = await paginate<Leave>('leaves', params, whereClause, whereParams);
    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/leaves:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách nghỉ phép', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const validated = leaveSchema.parse(body);

    // Employees can only create for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || validated.employeeId !== user.employeeId) {
        return createErrorResponse('Bạn chỉ có thể tạo đơn nghỉ phép cho chính mình', 403);
      }
    }

    // Check employee exists
    const empCheck = await query('SELECT id FROM employees WHERE id = ?', [validated.employeeId]);
    if (!Array.isArray(empCheck) || empCheck.length === 0) {
      return createErrorResponse('Nhân viên không tồn tại', 400);
    }

    // Calculate days
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);
    if (endDate < startDate) {
      return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
    }
    const days = differenceInDays(endDate, startDate) + 1;

    const result = await query(
      'INSERT INTO leaves (employeeId, type, startDate, endDate, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        validated.employeeId,
        validated.type,
        formatDate(validated.startDate)!,
        formatDate(validated.endDate)!,
        days,
        validated.reason,
        'pending',
      ]
    ) as any;

    const newLeave = await query('SELECT * FROM leaves WHERE id = ?', [result.insertId]);
    const leaveList = Array.isArray(newLeave) ? newLeave : [newLeave];
    return createSuccessResponse(leaveList[0], 'Tạo đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/leaves:', error);
    return createErrorResponse(error.message || 'Lỗi tạo đơn nghỉ phép', 500);
  }
}

