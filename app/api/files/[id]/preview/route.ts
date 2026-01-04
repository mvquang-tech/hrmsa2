import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const id = parseInt(params.id);
    const rows = await query('SELECT * FROM files WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 404 });

    const file = rows[0];
    const abs = path.join(process.cwd(), 'public', file.path.replace(/^\//, ''));
    const buffer = await fs.readFile(abs);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.originalName}"`,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/files/[id]/preview:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi preview file' }, { status: 500 });
  }
}