import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    const rows = await query('SELECT id, code, firstName, lastName, departmentId FROM employees ORDER BY lastName, firstName LIMIT ?', [limit]);
    const list = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    return createSuccessResponse(list);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/employees/list:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách nhân viên', 500);
  }
}
