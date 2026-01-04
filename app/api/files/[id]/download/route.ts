import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, checkPermission } from '@/lib/middleware/auth';
import { verifyToken } from '@/lib/utils/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Auth: try header token first, then query token fallback (?token=...)
    let auth: any = null;
    try {
      auth = await requireAuth(request);
      if (auth instanceof NextResponse) return auth;
    } catch (e: any) {
      // try token in query param
      try {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        if (token) {
          const payload = verifyToken(token);
          if (!payload) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
          auth = payload as any;
        } else {
          throw e;
        }
      } catch (innerErr) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const id = parseInt(params.id);
    const rows = await query('SELECT * FROM files WHERE id = ?', [id]);
    if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ success: false, error: 'Không tìm thấy file' }, { status: 404 });

    const file = rows[0];

    // Permission: require files.download
    try {
      const allowed = await checkPermission(auth as any, 'files.download');
      if (!allowed) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    } catch (permErr: any) {
      console.error('Permission check error for download', permErr);
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const abs = path.join(process.cwd(), 'public', file.path.replace(/^\//, ''));

    // Extra checks and logging for debugging download issues
    try {
      await fs.access(abs);
    } catch (fsErr) {
      console.error('Download error: file does not exist on disk', { abs, file });
      return NextResponse.json({ success: false, error: 'File not found on server' }, { status: 404 });
    }

    // Log request headers for debugging when downloads fail in browser
    try {
      console.info('Download request headers:', Object.fromEntries(request.headers.entries()));
    } catch (e) {
      // ignore
    }

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(abs);
    } catch (readErr: any) {
      console.error('Error reading file for download', { abs, err: readErr });
      return NextResponse.json({ success: false, error: readErr.message || 'Lỗi đọc file' }, { status: 500 });
    }

    // Convert Buffer to Uint8Array for NextResponse body compatibility
    // Build proper Content-Disposition with fallback for non-ASCII filenames
    const safeName = (file.originalName || '').replace(/"/g, '');
    const disposition = `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;

    return new NextResponse(new Uint8Array(buffer as any), {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': disposition,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/files/[id]/download:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi download file' }, { status: 500 });
  }
}