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

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId || undefined,
    });

    return createSuccessResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    return createErrorResponse(error.message || 'Lỗi đăng nhập', 500);
  }
}

