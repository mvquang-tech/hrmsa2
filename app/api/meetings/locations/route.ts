import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/middleware/auth';

// GET /api/meetings/locations - return distinct non-empty locations
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Return distinct non-empty locations ordered by most recently used
    const rows = await query(`
      SELECT location, COUNT(*) as cnt, MAX(date) as lastDate
      FROM meetings
      WHERE location IS NOT NULL AND TRIM(location) <> ''
      GROUP BY location
      ORDER BY lastDate DESC, cnt DESC
      LIMIT 200
    `, []);

    const locations = Array.isArray(rows) ? rows.map((r: any) => r.location) : [];

    return NextResponse.json({ success: true, data: locations });
  } catch (err: any) {
    console.error('Error in GET /api/meetings/locations', err);
    return NextResponse.json({ success: false, error: err.message || 'Lỗi lấy danh sách địa điểm' }, { status: 500 });
  }
}
