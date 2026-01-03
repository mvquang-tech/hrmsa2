import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { updateUserRolesSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { hashPassword } from '@/lib/utils/auth';
import { UserRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });

    const users = await query(
      'SELECT id, username, email, employeeId, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    const userList = Array.isArray(users) ? users : [users];
    
    if (userList.length === 0) {
      return createErrorResponse('Người dùng không tồn tại', 404);
    }

    const user = userList[0];

    // Get roles
    const roles = await query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON ur.roleId = r.id
      WHERE ur.userId = ?
    `, [id]);

    // Get permissions
    const permissions = await query(`
      SELECT DISTINCT p.code FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      INNER JOIN user_roles ur ON ur.roleId = rp.roleId
      WHERE ur.userId = ?
    `, [id]);

    return createSuccessResponse({
      ...user,
      roles: Array.isArray(roles) ? roles : [],
      permissions: Array.isArray(permissions) ? permissions.map((p: any) => p.code) : []
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/users/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin người dùng', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();

    // Check if user exists
    const existing = await query('SELECT id, username FROM users WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    
    if (existingList.length === 0) {
      return createErrorResponse('Người dùng không tồn tại', 404);
    }

    // Prevent modifying admin user's username
    if (existingList[0].username === 'admin' && body.username && body.username !== 'admin') {
      return createErrorResponse('Không thể thay đổi tên đăng nhập của admin', 400);
    }

    // Update user fields if provided
    const updates: string[] = [];
    const values: any[] = [];

    if (body.email) {
      // Check email uniqueness
      const emailCheck = await query('SELECT id FROM users WHERE email = ? AND id != ?', [body.email, id]);
      if (Array.isArray(emailCheck) && emailCheck.length > 0) {
        return createErrorResponse('Email đã tồn tại', 400);
      }
      updates.push('email = ?');
      values.push(body.email);
    }

    if (body.password) {
      const hashedPassword = await hashPassword(body.password);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (body.employeeId !== undefined) {
      updates.push('employeeId = ?');
      values.push(body.employeeId || null);
    }

    if (updates.length > 0) {
      values.push(id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    // Update roles if provided
    if (body.roleIds && Array.isArray(body.roleIds)) {
      const { roleIds } = updateUserRolesSchema.parse({ roleIds: body.roleIds });
      
      // Delete existing roles
      await query('DELETE FROM user_roles WHERE userId = ?', [id]);
      
      // Insert new roles
      if (roleIds.length > 0) {
        const roleValues = roleIds.map(roleId => `(${id}, ${roleId})`).join(', ');
        await query(`INSERT INTO user_roles (userId, roleId) VALUES ${roleValues}`, []);
      }
    }

    // Get updated user
    const users = await query(
      'SELECT id, username, email, employeeId, createdAt, updatedAt FROM users WHERE id = ?',
      [id]
    );
    const userList = Array.isArray(users) ? users : [users];
    const updatedUser = userList[0];

    const roles = await query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON ur.roleId = r.id
      WHERE ur.userId = ?
    `, [id]);

    return createSuccessResponse({
      ...updatedUser,
      roles: Array.isArray(roles) ? roles : []
    }, 'Cập nhật người dùng thành công');
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
    console.error('Error in PUT /api/admin/users/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật người dùng', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });

    // Check if user exists
    const existing = await query('SELECT id, username FROM users WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    
    if (existingList.length === 0) {
      return createErrorResponse('Người dùng không tồn tại', 404);
    }

    // Cannot delete admin user
    if (existingList[0].username === 'admin') {
      return createErrorResponse('Không thể xóa tài khoản admin', 400);
    }

    // Cannot delete yourself
    if (existingList[0].id === authUser.userId) {
      return createErrorResponse('Không thể xóa tài khoản của chính mình', 400);
    }

    await query('DELETE FROM users WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa người dùng thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa người dùng', 500);
  }
}

