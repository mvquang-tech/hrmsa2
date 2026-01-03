import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { departmentSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { UserRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const departments = await query('SELECT * FROM departments WHERE id = ?', [id]);
    const deptList = Array.isArray(departments) ? departments : [departments];

    if (!deptList || deptList.length === 0) {
      return createErrorResponse('Không tìm thấy phòng ban', 404);
    }

    return createSuccessResponse(deptList[0]);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in GET /api/departments/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin phòng ban', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can update departments
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();
    const validated = departmentSchema.parse(body);

    // Check if exists
    const existing = await query('SELECT id FROM departments WHERE id = ?', [id]);
    if (!Array.isArray(existing) || existing.length === 0) {
      return createErrorResponse('Không tìm thấy phòng ban', 404);
    }

    // Check if code exists (excluding current)
    const codeCheck = await query('SELECT id FROM departments WHERE code = ? AND id != ?', [validated.code, id]);
    if (Array.isArray(codeCheck) && codeCheck.length > 0) {
      return createErrorResponse('Mã phòng ban đã tồn tại', 400);
    }

    await query(
      'UPDATE departments SET name = ?, code = ?, description = ?, managerId = ? WHERE id = ?',
      [validated.name, validated.code, validated.description || null, validated.managerId || null, id]
    );

    const updated = await query('SELECT * FROM departments WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    return createSuccessResponse(updatedList[0], 'Cập nhật phòng ban thành công');
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
    console.error('Error in PUT /api/departments/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật phòng ban', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can delete departments
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const { id } = idSchema.parse({ id: params.id });

    // Check if has employees
    const employees = await query('SELECT id FROM employees WHERE departmentId = ?', [id]);
    if (Array.isArray(employees) && employees.length > 0) {
      return createErrorResponse('Không thể xóa phòng ban đang có nhân viên', 400);
    }

    await query('DELETE FROM departments WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa phòng ban thành công');
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
    console.error('Error in DELETE /api/departments/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa phòng ban', 500);
  }
}

