import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/middleware/auth';
import { z } from 'zod';

const meetingSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống'),
  date: z.string().min(1, 'Ngày không được để trống'),
  time: z.string().min(1, 'Giờ không được để trống'),
  duration: z.number().min(15).max(480).default(60),
  location: z.string().optional().nullable(),
  attendees: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reminderEnabled: z.boolean().default(false),
  reminderMinutes: z.number().min(5).max(1440).default(15),
  status: z.enum(['upcoming','ongoing','finished','unknown']).optional(),
});

// GET - Lấy danh sách cuộc họp
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let meetings;
    
    // Admin/HR/Manager xem tất cả, Employee chỉ xem của mình
    if (['admin', 'hr', 'manager'].includes(user.role)) {
      meetings = await query(`
        SELECT m.*, 
               CONCAT(e.firstName, ' ', e.lastName) as creatorName,
               e.code as creatorCode,
               (mr.readAt IS NOT NULL) AS isRead
        FROM meetings m
        LEFT JOIN employees e ON m.createdBy = e.id
        LEFT JOIN meeting_reads mr ON mr.meetingId = m.id AND mr.userId = ?
        ORDER BY m.date DESC, m.time ASC
      `, [user.employeeId]);
    } else {
      meetings = await query(`
        SELECT m.*, 
               CONCAT(e.firstName, ' ', e.lastName) as creatorName,
               e.code as creatorCode,
               (mr.readAt IS NOT NULL) AS isRead
        FROM meetings m
        LEFT JOIN employees e ON m.createdBy = e.id
        LEFT JOIN meeting_reads mr ON mr.meetingId = m.id AND mr.userId = ?
        WHERE m.createdBy = ?
        ORDER BY m.date DESC, m.time ASC
      `, [user.employeeId, user.employeeId]);
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(meetings) ? meetings : [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/meetings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lấy danh sách cuộc họp' },
      { status: 500 }
    );
  }
}

// POST - Tạo cuộc họp mới
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.employeeId) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản chưa liên kết với nhân viên' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = meetingSchema.parse(body);

    const result = await query(`
      INSERT INTO meetings 
      (title, date, time, duration, location, attendees, notes, 
       reminderEnabled, reminderMinutes, status, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      validated.title,
      validated.date,
      validated.time,
      validated.duration,
      validated.location || null,
      validated.attendees || null,
      validated.notes || null,
      validated.reminderEnabled ? 1 : 0,
      validated.reminderMinutes,
      validated.status || 'upcoming',
      user.employeeId
    ]);

    const insertId = (result as any).insertId;
    
    const [newMeeting] = await query(
      'SELECT * FROM meetings WHERE id = ?', 
      [insertId]
    ) as any[];

    return NextResponse.json({
      success: true,
      data: newMeeting,
    });
  } catch (error: any) {
    console.error('Error in POST /api/meetings:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi tạo cuộc họp' },
      { status: 500 }
    );
  }
}
