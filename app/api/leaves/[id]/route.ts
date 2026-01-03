import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { leaveSchema, idSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { UserRole, LeaveSessions } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';
import { calculateDaysFromSessions, normalizeSessions, normalizeDate } from '@/lib/utils/leave-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const leaves = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const leaveList = Array.isArray(leaves) ? leaves : [leaves];

    if (!leaveList || leaveList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    const leave = leaveList[0];

    // Load sessions from leave_sessions table
    const sessionsData = await query(
      'SELECT date, sessionType FROM leave_sessions WHERE leaveId = ? ORDER BY date, sessionType',
      [id]
    ) as any[];
    
    const sessions: LeaveSessions = {};
    if (Array.isArray(sessionsData)) {
      sessionsData.forEach((row: any) => {
        const dateKey = normalizeDate(row.date);
        if (!sessions[dateKey]) {
          sessions[dateKey] = [];
        }
        if (row.sessionType === 'morning' || row.sessionType === 'afternoon') {
          sessions[dateKey].push(row.sessionType);
        }
      });
    }
    leave.sessions = sessions;

    // Employees can only see their own
    if (user.role === UserRole.EMPLOYEE && user.employeeId !== leave.employeeId) {
      return createErrorResponse('Không có quyền truy cập', 403);
    }

    return createSuccessResponse(leave);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in GET /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi lấy thông tin nghỉ phép', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });
    const body = await request.json();

    const [existing] = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    if ((existing as any[]).length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    const existingLeave = (existing as any[])[0];

    // Employees can only update pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingLeave.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền cập nhật', 403);
      }
      if (existingLeave.status !== 'pending') {
        return createErrorResponse('Chỉ có thể cập nhật đơn đang chờ duyệt', 400);
      }
      const validated = leaveSchema.parse(body);
      const startDate = new Date(validated.startDate);
      const endDate = new Date(validated.endDate);
      if (endDate < startDate) {
        return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
      }
      // Normalize and calculate days from sessions
      let days = validated.days;
      let sessionsToSave: LeaveSessions = {};
      
      if (validated.sessions) {
        const normalizedSessions = normalizeSessions(validated.sessions);
        days = calculateDaysFromSessions(normalizedSessions);
        sessionsToSave = normalizedSessions;
      }
      
      // Update leave record
      await query(
        'UPDATE leaves SET type = ?, startDate = ?, endDate = ?, days = ?, reason = ? WHERE id = ?',
        [
          validated.type,
          formatDate(validated.startDate)!,
          formatDate(validated.endDate)!,
          days,
          validated.reason,
          id,
        ]
      );

      // Delete existing sessions and insert new ones
      await query('DELETE FROM leave_sessions WHERE leaveId = ?', [id]);
      
      if (Object.keys(sessionsToSave).length > 0) {
        const sessionInserts: Array<[number, string, string]> = [];
        
        Object.keys(sessionsToSave).forEach(dateKey => {
          const normalizedDate = normalizeDate(dateKey);
          const sessionArray = sessionsToSave[dateKey];
          
          if (Array.isArray(sessionArray)) {
            sessionArray.forEach(sessionType => {
              if (sessionType === 'morning' || sessionType === 'afternoon') {
                sessionInserts.push([id, normalizedDate, sessionType]);
              }
            });
          }
        });

        if (sessionInserts.length > 0) {
          await query(
            'INSERT INTO leave_sessions (leaveId, date, sessionType) VALUES ?',
            [sessionInserts]
          );
        }
      }
    } else {
      // Managers/HR/Admin can approve/reject
      if (body.status && ['approved', 'rejected'].includes(body.status)) {
        await query(
          'UPDATE leaves SET status = ?, approvedBy = ?, approvedAt = NOW() WHERE id = ?',
          [body.status, user.userId, id]
        );
      } else {
        const validated = leaveSchema.parse(body);
        const startDate = new Date(validated.startDate);
        const endDate = new Date(validated.endDate);
        if (endDate < startDate) {
          return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
        }
        // Normalize and calculate days from sessions
        let days = validated.days;
        let sessionsToSave: LeaveSessions = {};
        
        if (validated.sessions) {
          const normalizedSessions = normalizeSessions(validated.sessions);
          days = calculateDaysFromSessions(normalizedSessions);
          sessionsToSave = normalizedSessions;
        }
        
        // Update leave record
        await query(
          'UPDATE leaves SET type = ?, startDate = ?, endDate = ?, days = ?, reason = ? WHERE id = ?',
          [
            validated.type,
            formatDate(validated.startDate)!,
            formatDate(validated.endDate)!,
            days,
            validated.reason,
            id,
          ]
        );

        // Delete existing sessions and insert new ones
        await query('DELETE FROM leave_sessions WHERE leaveId = ?', [id]);
        
        if (Object.keys(sessionsToSave).length > 0) {
          const sessionInserts: Array<[number, string, string]> = [];
          
          Object.keys(sessionsToSave).forEach(dateKey => {
            const normalizedDate = normalizeDate(dateKey);
            const sessionArray = sessionsToSave[dateKey];
            
            if (Array.isArray(sessionArray)) {
              sessionArray.forEach(sessionType => {
                if (sessionType === 'morning' || sessionType === 'afternoon') {
                  sessionInserts.push([id, normalizedDate, sessionType]);
                }
              });
            }
          });

          if (sessionInserts.length > 0) {
            await query(
              'INSERT INTO leave_sessions (leaveId, date, sessionType) VALUES ?',
              [sessionInserts]
            );
          }
        }
      }
    }

    // Get updated leave with sessions
    const updated = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const updatedList = Array.isArray(updated) ? updated : [updated];
    const updatedLeave = updatedList[0];
    
    // Load sessions
    const sessionsData = await query(
      'SELECT date, sessionType FROM leave_sessions WHERE leaveId = ? ORDER BY date, sessionType',
      [id]
    ) as any[];
    
    const sessions: LeaveSessions = {};
    if (Array.isArray(sessionsData)) {
      sessionsData.forEach((row: any) => {
        const dateKey = normalizeDate(row.date);
        if (!sessions[dateKey]) {
          sessions[dateKey] = [];
        }
        if (row.sessionType === 'morning' || row.sessionType === 'afternoon') {
          sessions[dateKey].push(row.sessionType);
        }
      });
    }
    updatedLeave.sessions = sessions;
    
    return createSuccessResponse(updatedLeave, 'Cập nhật đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in PUT /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi cập nhật đơn nghỉ phép', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    const { id } = idSchema.parse({ id: params.id });

    const existing = await query('SELECT * FROM leaves WHERE id = ?', [id]);
    const existingList = Array.isArray(existing) ? existing : [existing];
    if (!existingList || existingList.length === 0) {
      return createErrorResponse('Không tìm thấy đơn nghỉ phép', 404);
    }

    const existingLeave = existingList[0];

    // Employees can only delete pending ones for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || existingLeave.employeeId !== user.employeeId) {
        return createErrorResponse('Không có quyền xóa', 403);
      }
      if (existingLeave.status !== 'pending') {
        return createErrorResponse('Chỉ có thể xóa đơn đang chờ duyệt', 400);
      }
    }

    await query('DELETE FROM leaves WHERE id = ?', [id]);
    return createSuccessResponse(null, 'Xóa đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in DELETE /api/leaves/[id]:', error);
    return createErrorResponse(error.message || 'Lỗi xóa đơn nghỉ phép', 500);
  }
}

