import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/middleware/auth';

// PUT /api/meetings/:id/read  -> mark as read (set readAt)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Ensure meeting exists
    const rows = await query('SELECT id FROM meetings WHERE id = ?', [params.id]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy cuộc họp' }, { status: 404 });
    }

    // Insert or update read timestamp for this user & meeting
    await query(`
      INSERT INTO meeting_reads (meetingId, userId, readAt)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE readAt = NOW()
    `, [params.id, user.employeeId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in PUT /api/meetings/:id/read', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}

// DELETE /api/meetings/:id/read -> mark as unread (delete record)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await query('DELETE FROM meeting_reads WHERE meetingId = ? AND userId = ?', [params.id, user.employeeId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in DELETE /api/meetings/:id/read', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server' }, { status: 500 });
  }
}
