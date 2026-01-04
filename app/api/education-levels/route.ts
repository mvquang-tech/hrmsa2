import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/middleware/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const rows = await query('SELECT id, code, name FROM education_levels ORDER BY id');
    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('Error in GET /api/education-levels:', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy danh sách trình độ' }, { status: 500 });
  }
}
