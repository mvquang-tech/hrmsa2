import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { leaveSchema, paginationSchema } from '@/lib/utils/validation';
import { createErrorResponse, createSuccessResponse, requireAuth } from '@/lib/middleware/auth';
import { paginate } from '@/lib/utils/db-helpers';
import { Leave, UserRole, LeaveSessions } from '@/lib/types';
import { formatDate } from '@/lib/utils/db-helpers';
import { calculateDaysFromSessions, normalizeSessions, normalizeDate } from '@/lib/utils/leave-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.parse(Object.fromEntries(searchParams));

    // Employees can only see their own leaves
    let whereClause = '';
    let whereParams: any[] = [];
    if (user.role === UserRole.EMPLOYEE && user.employeeId) {
      whereClause = 'employeeId = ?';
      whereParams = [user.employeeId];
    } else if (user.role === UserRole.MANAGER && user.employeeId) {
      // Managers can see leaves for employees in departments they manage
      const mgrDeptRows = await query('SELECT departmentId FROM department_managers WHERE employeeId = ?', [user.employeeId]);
      const deptIds = (Array.isArray(mgrDeptRows) ? mgrDeptRows : []).map((r: any) => r.departmentId);
      if (deptIds.length === 0) {
        // No managed departments -> return empty result
        whereClause = '1 = 0';
        whereParams = [];
      } else {
        // employeeId in employees of these departments
        whereClause = 'employeeId IN (SELECT id FROM employees WHERE departmentId IN (?))';
        whereParams = [deptIds];
      }
    }

    const result = await paginate<Leave>('leaves', params, whereClause, whereParams);
    
    // Load sessions from leave_sessions table for each leave
    if (result.data && Array.isArray(result.data)) {
      const leaveIds = result.data.map((leave: any) => leave.id);
      
      if (leaveIds.length > 0) {
        // Get all sessions for these leaves
        const placeholders = leaveIds.map(() => '?').join(',');
        const sessionsData = await query(
          `SELECT leaveId, date, sessionType FROM leave_sessions WHERE leaveId IN (${placeholders}) ORDER BY leaveId, date, sessionType`,
          leaveIds
        ) as any[];
        
        // Group sessions by leaveId
        const sessionsByLeaveId: Record<number, LeaveSessions> = {};
        
        if (Array.isArray(sessionsData)) {
          sessionsData.forEach((row: any) => {
            if (!sessionsByLeaveId[row.leaveId]) {
              sessionsByLeaveId[row.leaveId] = {};
            }
            const dateKey = normalizeDate(row.date);
            if (!sessionsByLeaveId[row.leaveId][dateKey]) {
              sessionsByLeaveId[row.leaveId][dateKey] = [];
            }
            if (row.sessionType === 'morning' || row.sessionType === 'afternoon') {
              sessionsByLeaveId[row.leaveId][dateKey].push(row.sessionType);
            }
          });
        }
        
        // Attach sessions to each leave
        result.data = result.data.map((leave: any) => {
          leave.sessions = sessionsByLeaveId[leave.id] || {};
          return leave;
        });
      } else {
        // No leaves, set empty sessions
        result.data = result.data.map((leave: any) => {
          leave.sessions = {};
          return leave;
        });
      }
    }
    
    return createSuccessResponse(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    console.error('Error in GET /api/leaves:', error);
    return createErrorResponse(error.message || 'Lỗi lấy danh sách nghỉ phép', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const validated = leaveSchema.parse(body);

    // Employees can only create for themselves
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employeeId || validated.employeeId !== user.employeeId) {
        return createErrorResponse('Bạn chỉ có thể tạo đơn nghỉ phép cho chính mình', 403);
      }
    }

    // Check employee exists
    const empCheck = await query('SELECT id FROM employees WHERE id = ?', [validated.employeeId]);
    if (!Array.isArray(empCheck) || empCheck.length === 0) {
      return createErrorResponse('Nhân viên không tồn tại', 400);
    }

    // Validate dates
    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);
    if (endDate < startDate) {
      return createErrorResponse('Ngày kết thúc phải sau ngày bắt đầu', 400);
    }
    
    // Normalize and calculate days from sessions
    let days = validated.days;
    let sessionsToSave: LeaveSessions = {};
    
    if (validated.sessions) {
      // Normalize sessions to ensure consistent format
      const normalizedSessions = normalizeSessions(validated.sessions);
      // Calculate days from normalized sessions
      days = calculateDaysFromSessions(normalizedSessions);
      sessionsToSave = normalizedSessions;
    }

    // Insert leave record
    const result = await query(
      'INSERT INTO leaves (employeeId, type, startDate, endDate, days, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        validated.employeeId,
        validated.type,
        formatDate(validated.startDate)!,
        formatDate(validated.endDate)!,
        days,
        validated.reason,
        'pending',
      ]
    ) as any;

    const leaveId = result.insertId;

    // Insert sessions into leave_sessions table
    if (Object.keys(sessionsToSave).length > 0) {
      const sessionInserts: Array<[number, string, string]> = [];
      
      Object.keys(sessionsToSave).forEach(dateKey => {
        const normalizedDate = normalizeDate(dateKey);
        const sessionArray = sessionsToSave[dateKey];
        
        if (Array.isArray(sessionArray)) {
          sessionArray.forEach(sessionType => {
            if (sessionType === 'morning' || sessionType === 'afternoon') {
              sessionInserts.push([leaveId, normalizedDate, sessionType]);
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

    // Get the created leave with sessions
    const newLeave = await query('SELECT * FROM leaves WHERE id = ?', [leaveId]);
    const leaveList = Array.isArray(newLeave) ? newLeave : [newLeave];
    const createdLeave = leaveList[0];
    
    // Load sessions
    const sessionsData = await query(
      'SELECT date, sessionType FROM leave_sessions WHERE leaveId = ? ORDER BY date, sessionType',
      [leaveId]
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
    createdLeave.sessions = sessions;
    
    // --- Send Telegram notification to the requester if configured ---
    // Synchronous send so we can record success/failure into leave_notification_logs
    try {
      const rows = await query(
        `SELECT u.id as userId, tc.botToken, tc.chatId, tc.enabled as telegramEnabled, CONCAT(e.firstName, ' ', e.lastName) as employeeName
         FROM employees e
         JOIN users u ON e.id = u.employeeId
         LEFT JOIN telegram_config tc ON tc.userId = u.id
         WHERE e.id = ?`,
        [createdLeave.employeeId]
      ) as any[];

      const cfg = Array.isArray(rows) && rows.length ? rows[0] : null;

      // Insert a pending log first
      await query(`INSERT INTO leave_notification_logs (leaveId, status) VALUES (?, 'pending')`, [leaveId]);
      const [logRow] = await query(`SELECT LAST_INSERT_ID() as id`) as any[];
      const logId = logRow ? logRow.id : null;

      if (cfg && cfg.botToken && cfg.chatId && cfg.telegramEnabled) {
        const msgLines = [
          `🔔 *THÔNG BÁO ĐƠN NGHỈ PHÉP*`,
          ``,
          `👤 *Người nộp:* ${cfg.employeeName}`,
          `📆 *Từ:* ${formatDate(createdLeave.startDate)}`,
          `📆 *Đến:* ${formatDate(createdLeave.endDate)}`,
          `⏱️ *Số ngày:* ${createdLeave.days}`,
        ];

        if (createdLeave.reason) {
          msgLines.push(``, `📝 *Lý do:*`, createdLeave.reason);
        }

        msgLines.push(``, `_Trạng thái: ${createdLeave.status}_`);

        const telegramUrl = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
        const resp = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cfg.chatId,
            text: msgLines.join('\n'),
            parse_mode: 'Markdown',
          }),
        });

        const result = await resp.json();
        if (result && result.ok) {
          await query(`UPDATE leave_notification_logs SET status = 'sent', sentAt = NOW() WHERE id = ?`, [logId]);
        } else {
          await query(`UPDATE leave_notification_logs SET status = 'failed', error = ? WHERE id = ?`, [JSON.stringify(result), logId]);
          console.warn('Telegram send failed for leave:', result);
        }
      } else {
        // Not configured: mark as failed with reason
        await query(`UPDATE leave_notification_logs SET status = 'failed', error = ? WHERE id = ?`, ['Telegram not configured or disabled', logId]);
        console.warn('Telegram not configured for leave requester');
      }
    } catch (err: any) {
      // Attempt to write failure to leave_notification_logs (best-effort)
      try {
        await query(`INSERT INTO leave_notification_logs (leaveId, status, error) VALUES (?, 'failed', ?)` , [leaveId, err.message]);
      } catch (innerErr) {
        console.error('Failed to insert leave_notification_logs entry:', innerErr);
      }

      console.error('Error sending leave Telegram notification:', err);
    }

    return createSuccessResponse(createdLeave, 'Tạo đơn nghỉ phép thành công');
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Unauthorized', 401);
    }
    if (error.name === 'ZodError') {
      return createErrorResponse(error.errors[0].message, 400);
    }
    console.error('Error in POST /api/leaves:', error);
    return createErrorResponse(error.message || 'Lỗi tạo đơn nghỉ phép', 500);
  }
}

