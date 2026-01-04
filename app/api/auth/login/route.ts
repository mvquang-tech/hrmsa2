import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, comparePassword, generateToken } from '@/lib/utils/auth';
import { loginSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const users = await query(
      'SELECT id, username, email, password, role, employeeId FROM users WHERE username = ?',
      [validated.username]
    );

    const userList = Array.isArray(users) ? users : (users ? [users] : []);
    if (userList.length === 0) {
      return createErrorResponse('Tên đăng nhập hoặc mật khẩu không đúng', 401);
    }

    const user = userList[0];
    if (!user || !user.password) {
      return createErrorResponse('Tên đăng nhập hoặc mật khẩu không đúng', 401);
    }
    const isValidPassword = await comparePassword(validated.password, user.password);

    if (!isValidPassword) {
      return createErrorResponse('Tên đăng nhập hoặc mật khẩu không đúng', 401);
    }

    // Get user permissions from RBAC tables
    let permissions: string[] = [];
    
    // Load assigned roles for the user (user_roles)
    const assignedRoles = await query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON ur.roleId = r.id
      WHERE ur.userId = ?
    `, [user.id]);
    const assignedRoleCodes = Array.isArray(assignedRoles) ? assignedRoles.map((r: any) => r.code) : [];

    // Admin has all permissions (either via users.role column or assigned roles)
    if (user.role === 'admin' || assignedRoleCodes.includes('admin')) {
      const allPerms = await query('SELECT code FROM permissions', []);
      permissions = Array.isArray(allPerms) ? allPerms.map((p: any) => p.code) : [];
    } else {
      // Get permissions based on user's roles
      const userPerms = await query(`
        SELECT DISTINCT p.code FROM permissions p
        INNER JOIN role_permissions rp ON rp.permissionId = p.id
        INNER JOIN user_roles ur ON ur.roleId = rp.roleId
        WHERE ur.userId = ?
      `, [user.id]);
      permissions = Array.isArray(userPerms) ? userPerms.map((p: any) => p.code) : [];
    }

    // Determine effective role for JWT (promote to 'admin' if assigned)
    const effectiveRole = (user.role === 'admin' || assignedRoleCodes.includes('admin')) ? 'admin' : user.role;

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: effectiveRole,
      employeeId: user.employeeId || undefined,
    });

    return createSuccessResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: effectiveRole,
        employeeId: user.employeeId,
      },
      permissions,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Login error:', error);
    return createErrorResponse(error.message || 'Lỗi đăng nhập', 500);
  }
}

