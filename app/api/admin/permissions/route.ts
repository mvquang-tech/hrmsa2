import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { permissionSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Permission, UserRole } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped') === 'true';

    if (grouped) {
      // Return permissions grouped by module
      const permissions = await query('SELECT * FROM permissions ORDER BY module, action', []);
      const permList = Array.isArray(permissions) ? permissions : [];
      
      const grouped = permList.reduce((acc: any, perm: Permission) => {
        if (!acc[perm.module]) {
          acc[perm.module] = [];
        }
        acc[perm.module].push(perm);
        return acc;
      }, {});

      return createSuccessResponse(grouped);
    }

    const params = paginationSchema.parse(Object.fromEntries(searchParams));
    const result = await paginate<Permission>('permissions', params);
    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/permissions:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách quyền', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const body = await request.json();
    const validated = permissionSchema.parse(body);

    // Check if code exists
    const existing = await query('SELECT id FROM permissions WHERE code = ?', [validated.code]);
    if (Array.isArray(existing) && existing.length > 0) {
      return createErrorResponse('Mã quyền đã tồn tại', 400);
    }

    const result = await query(
      'INSERT INTO permissions (name, code, module, action, description) VALUES (?, ?, ?, ?, ?)',
      [validated.name, validated.code, validated.module, validated.action, validated.description || null]
    ) as any;

    const newPerm = await query('SELECT * FROM permissions WHERE id = ?', [result.insertId]);
    const permList = Array.isArray(newPerm) ? newPerm : [newPerm];
    return createSuccessResponse(permList[0], 'Tạo quyền thành công');
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
    console.error('Error in POST /api/admin/permissions:', error);
    return createErrorResponse(error.message || 'Lỗi tạo quyền', 500);
  }
}


