import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { rolePermissionsSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { UserRole } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { id } = idSchema.parse({ id: params.id });

    const permissions = await query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      WHERE rp.roleId = ?
      ORDER BY p.module, p.action
    `, [id]);

    return createSuccessResponse(Array.isArray(permissions) ? permissions : []);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/roles/[id]/permissions:', error);
    return createErrorResponse(error.message || 'Lỗi lấy quyền của vai trò', 500);
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
    const { permissionIds } = rolePermissionsSchema.parse(body);

    // Check if role exists
    const existing = await query('SELECT id FROM roles WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    
    if (existingList.length === 0) {
      return createErrorResponse('Vai trò không tồn tại', 404);
    }

    // Delete existing permissions
    await query('DELETE FROM role_permissions WHERE roleId = ?', [id]);

    // Insert new permissions
    if (permissionIds.length > 0) {
      const values = permissionIds.map(pId => `(${id}, ${pId})`).join(', ');
      await query(`INSERT INTO role_permissions (roleId, permissionId) VALUES ${values}`, []);
    }

    // Get updated permissions
    const permissions = await query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      WHERE rp.roleId = ?
      ORDER BY p.module, p.action
    `, [id]);

    return createSuccessResponse(
      Array.isArray(permissions) ? permissions : [],
      'Cập nhật quyền thành công'
    );
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
    console.error('Error in PUT /api/admin/roles/[id]/permissions:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật quyền', 500);
  }
}

