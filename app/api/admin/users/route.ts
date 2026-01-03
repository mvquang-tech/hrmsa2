import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { userWithRolesSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { hashPassword } from '@/lib/utils/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { User, UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    // Get users with their roles
    const result = await paginate<User>('users', params);
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      result.data.map(async (user: any) => {
        const roles = await query(`
          SELECT r.* FROM roles r
          INNER JOIN user_roles ur ON ur.roleId = r.id
          WHERE ur.userId = ?
        `, [user.id]);
        
        return {
          ...user,
          password: undefined, // Don't return password
          roles: Array.isArray(roles) ? roles : []
        };
      })
    );

    return createSuccessResponse({
      ...result,
      data: usersWithRoles
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/users:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách người dùng', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const body = await request.json();
    const validated = userWithRolesSchema.parse(body);

    // Check if username exists
    const existingUsername = await query('SELECT id FROM users WHERE username = ?', [validated.username]);
    if (Array.isArray(existingUsername) && existingUsername.length > 0) {
      return createErrorResponse('Tên đăng nhập đã tồn tại', 400);
    }

    // Check if email exists
    const existingEmail = await query('SELECT id FROM users WHERE email = ?', [validated.email]);
    if (Array.isArray(existingEmail) && existingEmail.length > 0) {
      return createErrorResponse('Email đã tồn tại', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(validated.password || 'password123');

    // Create user
    const result = await query(
      'INSERT INTO users (username, email, password, employeeId, role) VALUES (?, ?, ?, ?, ?)',
      [validated.username, validated.email, hashedPassword, validated.employeeId || null, 'employee']
    ) as any;

    const userId = result.insertId;

    // Assign roles
    if (validated.roleIds.length > 0) {
      const roleValues = validated.roleIds.map(roleId => `(${userId}, ${roleId})`).join(', ');
      await query(`INSERT INTO user_roles (userId, roleId) VALUES ${roleValues}`, []);
    }

    // Get created user with roles
    const users = await query('SELECT id, username, email, employeeId, createdAt FROM users WHERE id = ?', [userId]);
    const userList = Array.isArray(users) ? users : [users];
    const newUser = userList[0];

    const roles = await query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON ur.roleId = r.id
      WHERE ur.userId = ?
    `, [userId]);

    return createSuccessResponse({
      ...newUser,
      roles: Array.isArray(roles) ? roles : []
    }, 'Tạo người dùng thành công');
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
    console.error('Error in POST /api/admin/users:', error);
    return createErrorResponse(error.message || 'Lỗi tạo người dùng', 500);
  }
}


