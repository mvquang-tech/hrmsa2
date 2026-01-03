import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { departmentSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Department, UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    const result = await paginate<Department>('departments', params);
    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/departments:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách phòng ban', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can create departments
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const body = await request.json();
    const validated = departmentSchema.parse(body);

    // Check if code exists
    const existing = await query('SELECT id FROM departments WHERE code = ?', [validated.code]);
    if (Array.isArray(existing) && existing.length > 0) {
      return createErrorResponse('Mã phòng ban đã tồn tại', 400);
    }

    const result = await query(
      'INSERT INTO departments (name, code, description, managerId) VALUES (?, ?, ?, ?)',
      [validated.name, validated.code, validated.description || null, validated.managerId || null]
    ) as any;

    const newDept = await query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
    const deptList = Array.isArray(newDept) ? newDept : [newDept];
    return createSuccessResponse(deptList[0] || newDept, 'Tạo phòng ban thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Bạn không có quyền thực hiện thao tác này', 403);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/departments:', error);
    return createErrorResponse(error.message || 'Lỗi tạo phòng ban', 500);
  }
}

