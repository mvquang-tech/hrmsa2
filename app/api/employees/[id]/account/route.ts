import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { hashPassword } from '@/lib/utils/auth';
import { UserRole } from '@/lib/types';
import { z } from 'zod';

const createAccountSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập ít nhất 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

// GET: Check if employee has an account
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);

    const { id } = idSchema.parse({ id: params.id });

    // Check if employee exists
    const employees = await query('SELECT id, code, firstName, lastName, email FROM employees WHERE id = ?', [id]);
    const employeeList = Array.isArray(employees) ? employees : [employees];
    
    if (employeeList.length === 0) {
      return createErrorResponse('Nhân viên không tồn tại', 404);
    }

    // Check if account exists for this employee
    const users = await query('SELECT id, username, email FROM users WHERE employeeId = ?', [id]);
    const userList = Array.isArray(users) ? users : [];

    return createSuccessResponse({
      employee: employeeList[0],
      hasAccount: userList.length > 0,
      account: userList.length > 0 ? userList[0] : null
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/employees/[id]/account:', error);
    return createErrorResponse(error.message || 'Lỗi kiểm tra tài khoản', 500);
  }
}

// POST: Create account for employee
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN, UserRole.HR]);

    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();
    const validated = createAccountSchema.parse(body);

    // Check if employee exists
    const employees = await query('SELECT id, code, firstName, lastName, email FROM employees WHERE id = ?', [id]);
    const employeeList = Array.isArray(employees) ? employees : [employees];
    
    if (employeeList.length === 0) {
      return createErrorResponse('Nhân viên không tồn tại', 404);
    }

    const employee = employeeList[0];

    // Check if account already exists for this employee
    const existingAccount = await query('SELECT id FROM users WHERE employeeId = ?', [id]);
    if (Array.isArray(existingAccount) && existingAccount.length > 0) {
      return createErrorResponse('Nhân viên đã có tài khoản', 400);
    }

    // Check if username already exists
    const existingUsername = await query('SELECT id FROM users WHERE username = ?', [validated.username]);
    if (Array.isArray(existingUsername) && existingUsername.length > 0) {
      return createErrorResponse('Tên đăng nhập đã tồn tại', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password);

    // Create user account
    const result = await query(
      'INSERT INTO users (username, email, password, role, employeeId) VALUES (?, ?, ?, ?, ?)',
      [validated.username, employee.email, hashedPassword, 'employee', id]
    ) as any;

    const userId = result.insertId;

    // Assign employee role
    const employeeRoles = await query('SELECT id FROM roles WHERE code = ?', ['employee']);
    const roleList = Array.isArray(employeeRoles) ? employeeRoles : [];
    
    if (roleList.length > 0) {
      await query('INSERT INTO user_roles (userId, roleId) VALUES (?, ?)', [userId, roleList[0].id]);
    }

    return createSuccessResponse({
      userId,
      username: validated.username,
      email: employee.email,
      employeeId: id,
      employeeName: `${employee.firstName} ${employee.lastName}`
    }, 'Tạo tài khoản thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/employees/[id]/account:', error);
    return createErrorResponse(error.message || 'Lỗi tạo tài khoản', 500);
  }
}

// DELETE: Remove account for employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });

    // Check if account exists for this employee
    const users = await query('SELECT id, username FROM users WHERE employeeId = ?', [id]);
    const userList = Array.isArray(users) ? users : [];
    
    if (userList.length === 0) {
      return createErrorResponse('Nhân viên chưa có tài khoản', 404);
    }

    // Cannot delete admin account
    if (userList[0].username === 'admin') {
      return createErrorResponse('Không thể xóa tài khoản admin', 400);
    }

    await query('DELETE FROM users WHERE employeeId = ?', [id]);
    return createSuccessResponse(null, 'Xóa tài khoản thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in DELETE /api/employees/[id]/account:', error);
    return createErrorResponse(error.message || 'Lỗi xóa tài khoản', 500);
  }
}

