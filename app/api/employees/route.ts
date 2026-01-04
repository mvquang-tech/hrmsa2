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

    // Attach education level name (avoid N+1 by fetching all levels first)
    const levels = await query('SELECT id, name FROM education_levels');
    const levelMap = new Map((levels || []).map((l: any) => [l.id, l.name]));
    // Fetch academic titles and map
    const titles = await query('SELECT id, name FROM academic_titles');
    const titleMap = new Map((titles || []).map((t: any) => [t.id, t.name]));
    const withEducation = employeesWithAccountInfo.map((emp: any) => ({
      ...emp,
      educationLevelId: emp.educationLevelId || null,
      educationLevelName: emp.educationLevelId ? levelMap.get(emp.educationLevelId) : null,
      academicTitleId: emp.academicTitleId || null,
      academicTitleName: emp.academicTitleId ? titleMap.get(emp.academicTitleId) : null,
    }));

    return createSuccessResponse({
      ...result,
      data: withEducation
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
      `INSERT INTO employees (code, firstName, lastName, email, phone, address, dateOfBirth, dateOfJoin, departmentId, position, salary, status, educationLevelId, academicTitleId, placeOfTraining, gender, cccdNumber, cccdIssuedDate, cccdIssuedPlace, internshipStart, internshipEnd, trainingStart, trainingEnd, probationStart, probationEnd, officialStart, officialEnd) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

