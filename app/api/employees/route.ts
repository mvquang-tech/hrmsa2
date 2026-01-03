import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { employeeSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Employee, UserRole } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    const result = await paginate<Employee>('employees', params);
    
    // Add hasAccount flag for each employee
    const employeesWithAccountInfo = await Promise.all(
      result.data.map(async (emp: any) => {
        const users = await query('SELECT id FROM users WHERE employeeId = ?', [emp.id]);
        return {
          ...emp,
          hasAccount: Array.isArray(users) && users.length > 0
        };
      })
    );

    return createSuccessResponse({
      ...result,
      data: employeesWithAccountInfo
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/employees:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách nhân viên', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    // Only admin and hr can create employees
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);
    const body = await request.json();
    const validated = employeeSchema.parse(body);

    // Check if code exists
    const existing = await query('SELECT id FROM employees WHERE code = ?', [validated.code]);
    if (Array.isArray(existing) && existing.length > 0) {
      return createErrorResponse('Mã nhân viên đã tồn tại', 400);
    }

    // Check if email exists
    const emailCheck = await query('SELECT id FROM employees WHERE email = ?', [validated.email]);
    if (Array.isArray(emailCheck) && emailCheck.length > 0) {
      return createErrorResponse('Email đã tồn tại', 400);
    }

    // Check department exists
    const deptCheck = await query('SELECT id FROM departments WHERE id = ?', [validated.departmentId]);
    if (!Array.isArray(deptCheck) || deptCheck.length === 0) {
      return createErrorResponse('Phòng ban không tồn tại', 400);
    }

    const result = await query(
      `INSERT INTO employees (code, firstName, lastName, email, phone, address, dateOfBirth, dateOfJoin, departmentId, position, salary, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ]
    ) as any;

    const newEmployee = await query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    const empList = Array.isArray(newEmployee) ? newEmployee : [newEmployee];
    return createSuccessResponse(empList[0], 'Tạo nhân viên thành công');
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
    console.error('Error in POST /api/employees:', error);
    return createErrorResponse(error.message || 'Lỗi tạo nhân viên', 500);
  }
}

