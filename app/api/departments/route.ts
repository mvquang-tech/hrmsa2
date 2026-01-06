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

    // Attach managers for each department
    const deptIds = (result.data || []).map((d: any) => d.id);
    if (deptIds.length > 0) {
      const mgrRows = await query('SELECT dm.departmentId, e.id, e.code, e.firstName, e.lastName FROM department_managers dm INNER JOIN employees e ON e.id = dm.employeeId WHERE dm.departmentId IN (?)', [deptIds]);
      const mgrMap = new Map<number, any[]>();
      (Array.isArray(mgrRows) ? mgrRows : []).forEach((r: any) => {
        const arr = mgrMap.get(r.departmentId) || [];
        arr.push({ id: r.id, code: r.code, firstName: r.firstName, lastName: r.lastName });
        mgrMap.set(r.departmentId, arr);
      });
      result.data = result.data.map((d: any) => ({ ...d, managers: mgrMap.get(d.id) || [] }));
    }

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

    // Insert department (leave managerId for backward compat; we will set it to first manager if provided)
    const primaryManager = Array.isArray(validated.managerIds) && validated.managerIds.length > 0 ? validated.managerIds[0] : (validated.managerId || null);

    const result = await query(
      'INSERT INTO departments (name, code, description, managerId) VALUES (?, ?, ?, ?)',
      [validated.name, validated.code, validated.description || null, primaryManager]
    ) as any;

    const newDeptId = result.insertId;

    // Insert many-to-many manager mappings if provided
    if (Array.isArray(validated.managerIds) && validated.managerIds.length > 0) {
      const inserts: Array<[number, number]> = [];
      validated.managerIds.forEach((mid: number) => {
        inserts.push([newDeptId, mid]);
      });
      await query('INSERT IGNORE INTO department_managers (departmentId, employeeId) VALUES ?', [inserts]);
    } else if (validated.managerId) {
      await query('INSERT IGNORE INTO department_managers (departmentId, employeeId) VALUES (?, ?)', [newDeptId, validated.managerId]);
    }

    const newDept = await query('SELECT * FROM departments WHERE id = ?', [newDeptId]);
    const deptList = Array.isArray(newDept) ? newDept : [newDept];
    // Attach managers to response
    const mgrRows = await query('SELECT e.id, e.code, e.firstName, e.lastName FROM department_managers dm INNER JOIN employees e ON e.id = dm.employeeId WHERE dm.departmentId = ?', [newDeptId]);
    const dept = (deptList[0] || newDept);
    dept.managers = Array.isArray(mgrRows) ? mgrRows : [];
    return createSuccessResponse(dept, 'Tạo phòng ban thành công');
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

