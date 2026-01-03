import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { roleSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { convertMySQLBooleans } from '@/lib/utils/db-helpers';
import { UserRole } from '@/lib/types';

const ROLE_BOOLEAN_FIELDS = ['isSystem', 'isActive'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });

    // Get role with permissions
    const roles = await query('SELECT * FROM roles WHERE id = ?', [id]);
    const roleList = Array.isArray(roles) ? roles : [roles];
    
    if (roleList.length === 0) {
      return createErrorResponse('Vai trò không tồn tại', 404);
    }

    const role = convertMySQLBooleans(roleList[0], ROLE_BOOLEAN_FIELDS);

    // Get permissions for this role
    const permissions = await query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      WHERE rp.roleId = ?
      ORDER BY p.module, p.action
    `, [id]);

    return createSuccessResponse({
      ...role,
      permissions: Array.isArray(permissions) ? permissions : []
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/roles/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin vai trò', 500);
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
    const validated = roleSchema.parse(body);

    // Check if role exists
    const existing = await query('SELECT id, isSystem FROM roles WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    
    if (existingList.length === 0) {
      return createErrorResponse('Vai trò không tồn tại', 404);
    }

    const existingRole = convertMySQLBooleans(existingList[0], ROLE_BOOLEAN_FIELDS);

    // Check if code exists for other role
    const codeCheck = await query('SELECT id FROM roles WHERE code = ? AND id != ?', [validated.code, id]);
    if (Array.isArray(codeCheck) && codeCheck.length > 0) {
      return createErrorResponse('Mã vai trò đã tồn tại', 400);
    }

    // System roles cannot change code
    if (existingRole.isSystem) {
      await query(
        'UPDATE roles SET name = ?, description = ?, isActive = ? WHERE id = ?',
        [validated.name, validated.description || null, validated.isActive ?? true, id]
      );
    } else {
      await query(
        'UPDATE roles SET name = ?, code = ?, description = ?, isActive = ? WHERE id = ?',
        [validated.name, validated.code, validated.description || null, validated.isActive ?? true, id]
      );
    }

    const updated = await query('SELECT * FROM roles WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    const updatedRole = convertMySQLBooleans(updatedList[0], ROLE_BOOLEAN_FIELDS);
    return createSuccessResponse(updatedRole, 'Cập nhật vai trò thành công');
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
    console.error('Error in PUT /api/admin/roles/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật vai trò', 500);
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

    // Check if role exists and is not system role
    const existing = await query('SELECT id, isSystem FROM roles WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    
    if (existingList.length === 0) {
      return createErrorResponse('Vai trò không tồn tại', 404);
    }

    const existingRole = convertMySQLBooleans(existingList[0], ROLE_BOOLEAN_FIELDS);
    if (existingRole.isSystem) {
      return createErrorResponse('Không thể xóa vai trò hệ thống', 400);
    }

    // Check if role is assigned to any user
    const users = await query('SELECT id FROM user_roles WHERE roleId = ?', [id]);
    if (Array.isArray(users) && users.length > 0) {
      return createErrorResponse('Không thể xóa vai trò đang được sử dụng', 400);
    }

    await query('DELETE FROM roles WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa vai trò thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in DELETE /api/admin/roles/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa vai trò', 500);
  }
}

