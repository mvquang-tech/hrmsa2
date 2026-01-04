import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/middleware/auth';
import { z } from 'zod';

const meetingUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  duration: z.number().min(1).optional(),
  location: z.string().optional().nullable(),
  attendees: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reminderEnabled: z.boolean().optional(),
  reminderMinutes: z.number().min(0).optional(),
  status: z.enum(['upcoming','ongoing','finished','unknown']).optional(),
});

async function findMeetingById(id: string | number) {
  const rows = await query('SELECT * FROM meetings WHERE id = ?', [id]);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// GET /api/meetings/:id
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    const rows = await query(
      `SELECT m.*, (mr.readAt IS NOT NULL) AS isRead
       FROM meetings m
       LEFT JOIN meeting_reads mr ON mr.meetingId = m.id AND mr.userId = ?
       WHERE m.id = ?`,
      [user?.employeeId || null, params.id]
    );

    const m = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!m) return NextResponse.json({ success: false, error: 'Không tìm thấy cuộc họp' }, { status: 404 });

    return NextResponse.json({ success: true, data: m });
  } catch (err: any) {
    console.error('Error in GET /api/meetings/:id', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// PUT /api/meetings/:id
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const meeting = await findMeetingById(params.id);
    if (!meeting) return NextResponse.json({ success: false, error: 'Không tìm thấy cuộc họp' }, { status: 404 });

    // Permission: admin/hr or owner
    if (!['admin','hr'].includes(user.role) && meeting.createdBy !== user.employeeId) {
      return NextResponse.json({ success: false, error: 'Không có quyền sửa cuộc họp' }, { status: 403 });
    }

    const body = await request.json();
    const validated = meetingUpdateSchema.parse(body);

    const fields: string[] = [];
    const values: any[] = [];

    for (const key of Object.keys(validated)) {
      fields.push(`\`${key}\` = ?`);
      values.push((validated as any)[key]);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
    }

    values.push(params.id);
    await query(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await findMeetingById(params.id);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error in PUT /api/meetings/:id', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors?.[0]?.message || 'Invalid data' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/meetings/:id
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const meeting = await findMeetingById(params.id);
    if (!meeting) return NextResponse.json({ success: false, error: 'Không tìm thấy cuộc họp' }, { status: 404 });

    // Permission: admin/hr or owner
    if (!['admin','hr'].includes(user.role) && meeting.createdBy !== user.employeeId) {
      return NextResponse.json({ success: false, error: 'Không có quyền xóa cuộc họp' }, { status: 403 });
    }

    await query('DELETE FROM meetings WHERE id = ?', [params.id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/meetings/:id', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
