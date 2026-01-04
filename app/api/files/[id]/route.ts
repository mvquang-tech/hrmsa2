import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, checkPermission } from '@/lib/middleware/auth';
import { deleteFileByPath, getAbsolutePath } from '@/lib/file-storage';
import fs from 'fs/promises';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const id = parseInt(params.id);
    const rows = await query(`
      SELECT f.*, u.username as createdByUsername, CONCAT(e.firstName, ' ', e.lastName) as createdByName
      FROM files f
      LEFT JOIN users u ON f.createdBy = u.id
      LEFT JOIN employees e ON u.employeeId = e.id
      WHERE f.id = ?
    `, [id]);
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 404 });

    const row = rows[0];
    try {
      row.tags = row.tags ? JSON.parse(row.tags) : [];
    } catch (e) {
      row.tags = [];
    }
    row.createdByName = row.createdByName || row.createdByUsername || (row.createdBy ? String(row.createdBy) : null);

    return NextResponse.json({ success: true, data: row });
  } catch (err: any) {
    console.error('Error in GET /api/files/[id]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy file' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const allowed = await checkPermission(auth as any, 'files.update');
    if (!allowed) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.id);
    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];

    if ('description' in body) { fields.push('description = ?'); values.push(body.description || null); }
    if ('tags' in body) { fields.push('tags = ?'); values.push(body.tags ? JSON.stringify(body.tags) : null); }
    if ('fileType' in body) { fields.push('fileType = ?'); values.push(body.fileType || null); }
    if ('notes' in body) { fields.push('notes = ?'); values.push(body.notes || null); }

    if (fields.length === 0) return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });

    values.push(id);
    await query(`UPDATE files SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await query('SELECT * FROM files WHERE id = ?', [id]);
    const urow = Array.isArray(updated) ? updated[0] : updated;
    if (!urow) return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 404 });

    try { urow.tags = urow.tags ? JSON.parse(urow.tags) : []; } catch (e) { urow.tags = []; }

    return NextResponse.json({ success: true, data: urow });
  } catch (err: any) {
    console.error('Error in PATCH /api/files/[id]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi cập nhật file' }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const allowed = await checkPermission(auth as any, 'files.delete');
    if (!allowed) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.id);
    const rows = await query('SELECT * FROM files WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 404 });

    const file = rows[0];
    await query('DELETE FROM files WHERE id = ?', [id]);
    await deleteFileByPath(file.path);

    return NextResponse.json({ success: true, message: 'Đã xóa file' });
  } catch (err: any) {
    console.error('Error in DELETE /api/files/[id]:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi xóa file' }, { status: 500 });
  }
}
