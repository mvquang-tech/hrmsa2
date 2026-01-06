import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { employeeSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole, isManagerOfEmployee } from '@/lib/middleware/auth';
import { formatDate } from '@/lib/utils/db-helpers';
import { UserRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const employees = await query('SELECT * FROM employees WHERE id = ?', [id]);
    const empList = Array.isArray(employees) ? employees : [employees];

    if (!empList || empList.length === 0) {
      return createErrorResponse('Không tìm thấy nhân viên', 404);
    }

    const emp = empList[0] as any;

    // Employees can only see their own
    if (user.role === UserRole.EMPLOYEE && user.employeeId !== emp.id) {
      return createErrorResponse('Không có quyền truy cập', 403);
    }

    // Managers can only view employees in departments they manage
    if (user.role === UserRole.MANAGER) {
      const allowed = await isManagerOfEmployee(user.employeeId, emp.id);
      if (!allowed) return createErrorResponse('Không có quyền truy cập', 403);
    }

    return createSuccessResponse(emp);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in GET /api/employees/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin nhân viên', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can update employees
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();
    const validated = employeeSchema.parse(body);

    // coerce educationLevelId and academicTitleId if sent as string
    if (validated.educationLevelId && typeof validated.educationLevelId === 'string') {
      validated.educationLevelId = parseInt(validated.educationLevelId, 10);
    }
    if (validated.academicTitleId && typeof validated.academicTitleId === 'string') {
      validated.academicTitleId = parseInt(validated.academicTitleId, 10);
    }

    // Check if exists
    const existing = await query('SELECT id FROM employees WHERE id = ?', [id]);
    if (!Array.isArray(existing) || existing.length === 0) {
      return createErrorResponse('Không tìm thấy nhân viên', 404);
    }

    // Check if code exists (excluding current)
    const codeCheck = await query('SELECT id FROM employees WHERE code = ? AND id != ?', [validated.code, id]);
    if (Array.isArray(codeCheck) && codeCheck.length > 0) {
      return createErrorResponse('Mã nhân viên đã tồn tại', 400);
    }

    // Check if email exists (excluding current)
    const emailCheck = await query('SELECT id FROM employees WHERE email = ? AND id != ?', [validated.email, id]);
    if (Array.isArray(emailCheck) && emailCheck.length > 0) {
      return createErrorResponse('Email đã tồn tại', 400);
    }

    // Check department exists
    const deptCheck = await query('SELECT id FROM departments WHERE id = ?', [validated.departmentId]);
    if (!Array.isArray(deptCheck) || deptCheck.length === 0) {
      return createErrorResponse('Phòng ban không tồn tại', 400);
    }

    await query(
      `UPDATE employees SET code = ?, firstName = ?, lastName = ?, email = ?, phone = ?, address = ?, 
       dateOfBirth = ?, dateOfJoin = ?, departmentId = ?, position = ?, salary = ?, status = ?, educationLevelId = ?, academicTitleId = ?, placeOfTraining = ?, gender = ?, cccdNumber = ?, cccdIssuedDate = ?, cccdIssuedPlace = ?, internshipStart = ?, internshipEnd = ?, trainingStart = ?, trainingEnd = ?, probationStart = ?, probationEnd = ?, officialStart = ?, officialEnd = ? WHERE id = ?`,
      [
        validated.code,
        validated.firstName,
        validated.lastName,
        validated.email,
        validated.phone || null,
        validated.address || null,
        validated.dateOfBirth ? formatDate(validated.dateOfBirth) : null,
        formatDate(validated.dateOfJoin)!,
        validated.departmentId,
        validated.position || null,
        validated.salary || null,
        validated.status,
        validated.educationLevelId || null,
        validated.academicTitleId || null,
        validated.placeOfTraining || null,
        validated.gender || null,
        validated.cccdNumber || null,
        validated.cccdIssuedDate ? formatDate(validated.cccdIssuedDate) : null,
        validated.cccdIssuedPlace || null,
        validated.internshipStart ? formatDate(validated.internshipStart) : null,
        validated.internshipEnd ? formatDate(validated.internshipEnd) : null,
        validated.trainingStart ? formatDate(validated.trainingStart) : null,
        validated.trainingEnd ? formatDate(validated.trainingEnd) : null,
        validated.probationStart ? formatDate(validated.probationStart) : null,
        validated.probationEnd ? formatDate(validated.probationEnd) : null,
        validated.officialStart ? formatDate(validated.officialStart) : null,
        validated.officialEnd ? formatDate(validated.officialEnd) : null,
        id,
      ]
    );

    const updated = await query('SELECT * FROM employees WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    return createSuccessResponse(updatedList[0], 'Cập nhật nhân viên thành công');
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
    console.error('Error in PUT /api/employees/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật nhân viên', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can delete employees
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const { id } = idSchema.parse({ id: params.id });

    await query('DELETE FROM employees WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa nhân viên thành công');
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
    console.error('Error in DELETE /api/employees/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa nhân viên', 500);
  }
}

