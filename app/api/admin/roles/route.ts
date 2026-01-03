import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { roleSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth, requireRole } from '@/lib/middleware/auth';
import { paginate, convertMySQLBooleansArray, convertMySQLBooleans } from '@/lib/utils/db-helpers';
import { Role, UserRole } from '@/lib/types';

const ROLE_BOOLEAN_FIELDS = ['isSystem', 'isActive'];

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    requireRole(user, [UserRole.ADMIN]);

    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    const result = await paginate<Role>('roles', params);
    // Convert MySQL TINYINT to boolean
    result.data = convertMySQLBooleansArray(result.data, ROLE_BOOLEAN_FIELDS);
    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.message === 'Forbidden') {
      return createErrorResponse('Không có quyền truy cập', 403);
    }
    console.error('Error in GET /api/admin/roles:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách vai trò', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    requireRole(authUser, [UserRole.ADMIN]);

    const body = await request.json();
    const validated = roleSchema.parse(body);

    // Check if code exists
    const existing = await query('SELECT id FROM roles WHERE code = ?', [validated.code]);
    if (Array.isArray(existing) && existing.length > 0) {
      return createErrorResponse('Mã vai trò đã tồn tại', 400);
    }

    const result = await query(
      'INSERT INTO roles (name, code, description, isActive) VALUES (?, ?, ?, ?)',
      [validated.name, validated.code, validated.description || null, validated.isActive ?? true]
    ) as any;

    const newRole = await query('SELECT * FROM roles WHERE id = ?', [result.insertId]);
    const roleList = Array.isArray(newRole) ? newRole : [newRole];
    const role = convertMySQLBooleans(roleList[0], ROLE_BOOLEAN_FIELDS);
    return createSuccessResponse(role, 'Tạo vai trò thành công');
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
    console.error('Error in POST /api/admin/roles:', error);
    return createErrorResponse(error.message || 'Lỗi tạo vai trò', 500);
  }
}

