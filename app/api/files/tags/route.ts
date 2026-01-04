import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const rows = await query('SELECT tags FROM files WHERE tags IS NOT NULL');
    const tagSet = new Set<string>();
    for (const r of (rows || [])) {
      try {
        const arr = JSON.parse(r.tags || '[]');
        if (Array.isArray(arr)) {
          for (const t of arr) if (t) tagSet.add(String(t));
        }
      } catch (e) {
        // ignore
      }
    }
    const tags = Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ success: true, data: tags });
  } catch (err: any) {
    console.error('Error in GET /api/files/tags:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy tags' }, { status: 500 });
  }
}