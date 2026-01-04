import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { saveBase64File } from '@/lib/file-storage';
import { requireAuth, checkPermission } from '@/lib/middleware/auth';
import { z } from 'zod';

const uploadSchema = z.object({
  originalName: z.string().min(1),
  content: z.string().min(1), // base64
  mimeType: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileType: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // pagination
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const rows = await query(`
      SELECT SQL_CALC_FOUND_ROWS f.*, u.username as createdByUsername, CONCAT(e.firstName, ' ', e.lastName) as createdByName
      FROM files f
      LEFT JOIN users u ON f.createdBy = u.id
      LEFT JOIN employees e ON u.employeeId = e.id
      ORDER BY f.createdAt DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);
    const totalRes = await query('SELECT FOUND_ROWS() as total');
    const total = Array.isArray(totalRes) && totalRes.length > 0 ? totalRes[0].total : 0;

    // Parse tags (stored as JSON) into arrays for client convenience and ensure createdByName
    const mapped = (rows || []).map((r: any) => {
      try {
        r.tags = r.tags ? JSON.parse(r.tags) : [];
      } catch (e) {
        r.tags = [];
      }
      r.createdByName = r.createdByName || r.createdByUsername || (r.createdBy ? String(r.createdBy) : null);
      return r;
    });

    return NextResponse.json({ success: true, data: { data: mapped, page, limit, total } });
  } catch (err: any) {
    console.error('Error in GET /api/files:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy danh sách file' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    // Only users with files.upload can upload
    const allowed = await checkPermission(auth as any, 'files.upload');
    if (!allowed) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const validated = uploadSchema.parse(body);

    // Guard: validate content exists
    if (!validated.content || typeof validated.content !== 'string') {
      return NextResponse.json({ success: false, error: 'No file content provided' }, { status: 400 });
    }

    // Save with size limit (50 MB)
    const MAX_BYTES = 50 * 1024 * 1024;
    let saved;
    try {
      saved = await saveBase64File(validated.content, validated.originalName, MAX_BYTES);
    } catch (saveErr: any) {
      console.error('File save error:', { message: saveErr.message, originalName: validated.originalName });
      return NextResponse.json({ success: false, error: saveErr.message || 'Lỗi lưu file' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO files (filename, originalName, mimeType, size, description, tags, fileType, notes, createdBy, path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [saved.storedName, saved.sanitizedOriginalName, validated.mimeType || null, saved.size, validated.description || null, validated.tags ? JSON.stringify(validated.tags) : null, validated.fileType || null, validated.notes || null, (auth as any).userId || null, saved.relativePath]
    ) as any;

    const inserted = await query('SELECT * FROM files WHERE id = ?', [result.insertId]);
    const row = Array.isArray(inserted) ? inserted[0] : inserted;

    return NextResponse.json({ success: true, data: row, message: 'Tải lên thành công' });
  } catch (err: any) {
    console.error('Error in POST /api/files:', err);
    if (err.name === 'ZodError') {
      return NextResponse.json({ success: false, error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: err.message || 'Lỗi tải lên' }, { status: 500 });
  }
}
