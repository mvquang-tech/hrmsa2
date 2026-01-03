import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { overtimeSchema, paginationSchema } from '@/lib/utils/validation';
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
    const validated = overtimeSchema.parse(body);

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

    const result = await query(
      'INSERT INTO overtime (employeeId, date, hours, reason, status) VALUES (?, ?, ?, ?, ?)',
      [validated.employeeId, formatDate(validated.date)!, validated.hours, validated.reason, 'pending']
    ) as any;

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

