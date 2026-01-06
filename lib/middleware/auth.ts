import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '../utils/auth';
import { UserRole } from '../types';
import { query } from '../db';

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

/**
 * Check if user has specific permission (RBAC)
 * @param userId - User ID
 * @param permissionCode - Permission code like 'users.create', 'departments.view'
 */
export async function hasPermission(userId: number, permissionCode: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT COUNT(*) as count FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      INNER JOIN user_roles ur ON ur.roleId = rp.roleId
      WHERE ur.userId = ? AND p.code = ?
    `, [userId, permissionCode]);
    
    const resultList = Array.isArray(result) ? result : [result];
    return resultList[0]?.count > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 * @param userId - User ID
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  try {
    const result = await query(`
      SELECT DISTINCT p.code FROM permissions p
      INNER JOIN role_permissions rp ON rp.permissionId = p.id
      INNER JOIN user_roles ur ON ur.roleId = rp.roleId
      WHERE ur.userId = ?
    `, [userId]);
    
    const resultList = Array.isArray(result) ? result : [];
    return resultList.map((p: any) => p.code);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Require specific permission (throws error if not allowed)
 * @param user - JWT payload from authentication
 * @param permissionCode - Permission code like 'users.create'
 */
export async function requirePermission(user: JWTPayload, permissionCode: string): Promise<void> {
  // Admin role always has all permissions
  if (user.role === UserRole.ADMIN) {
    return;
  }
  
  const allowed = await hasPermission(user.userId, permissionCode);
  if (!allowed) {
    throw new Error('Forbidden');
  }
}

/**
 * Non-throwing permission check
 */
export async function checkPermission(user: JWTPayload, permissionCode: string): Promise<boolean> {
  if (user.role === UserRole.ADMIN) return true;
  return await hasPermission(user.userId, permissionCode);
}

/**
 * Check if a given employeeId is a manager for the department of another employee (employeeId)
 * @param managerEmployeeId - employee.id of the manager user
 * @param employeeId - employee.id of the target employee
 */
export async function isManagerOfEmployee(managerEmployeeId: number | null | undefined, employeeId: number): Promise<boolean> {
  if (!managerEmployeeId) return false;
  const rows = await query(
    `SELECT COUNT(*) as cnt FROM department_managers dm
     INNER JOIN employees e ON e.departmentId = dm.departmentId
     WHERE dm.employeeId = ? AND e.id = ?`,
    [managerEmployeeId, employeeId]
  );
  const list = Array.isArray(rows) ? rows : [rows];
  return list[0]?.cnt > 0;
}

export async function isManagerOfDepartment(managerEmployeeId: number | null | undefined, departmentId: number): Promise<boolean> {
  if (!managerEmployeeId) return false;
  const rows = await query('SELECT COUNT(*) as cnt FROM department_managers WHERE departmentId = ? AND employeeId = ?', [departmentId, managerEmployeeId]);
  const list = Array.isArray(rows) ? rows : [rows];
  return list[0]?.cnt > 0;
}

/**
 * Get authenticated user info from request (token -> DB lookup)
 */
export async function getAuthUser(request: NextRequest): Promise<any | null> {
  const payload = authenticate(request);
  if (!payload) return null;

  try {
    const rows = await query('SELECT id, username, email, role, employeeId FROM users WHERE id = ?', [payload.userId]);
    const user = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (user) {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId || payload.employeeId || null,
      };
    }

    return {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      employeeId: payload.employeeId || null,
    };
  } catch (error) {
    console.error('Error in getAuthUser:', error);
    return null;
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

