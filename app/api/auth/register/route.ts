import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/utils/auth';
import { loginSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, authenticate, requireRole } from '@/lib/middleware/auth';
import { UserRole } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }
    requireRole(user, [UserRole.ADMIN, UserRole.HR]);

    const body = await request.json();
    const validated = loginSchema.parse(body);

    // Check if username exists
    const existing = await query('SELECT id FROM users WHERE username = ?', [validated.username]);
    if (Array.isArray(existing) && existing.length > 0) {
      return createErrorResponse('Tên đăng nhập đã tồn tại', 400);
    }

    const hashedPassword = await hashPassword(validated.password);

    const result = await query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [validated.username, validated.username + '@hrms.com', hashedPassword, UserRole.EMPLOYEE]
    ) as any;

    return createSuccessResponse({ id: result.insertId }, 'Tạo tài khoản thành công');
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    return createErrorResponse(error.message || 'Lỗi tạo tài khoản', 500);
  }
}

