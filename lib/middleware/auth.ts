import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '../utils/auth';
import { UserRole } from '../types';

export interface AuthRequest extends NextRequest {
  user?: JWTPayload;
}

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function authenticate(request: NextRequest): JWTPayload | null {
  const token = getAuthToken(request);
  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(request: NextRequest): JWTPayload {
  const user = authenticate(request);
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export function requireRole(user: JWTPayload, roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw new Error('Forbidden');
  }
}

export function createErrorResponse(message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export function createSuccessResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

