import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user.role !== 'admin' && user.role !== 'hr') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403 });
    }

    const migrationPath = path.join(process.cwd(), 'database', 'migration-overtime-days-slots.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute SQL as multiple statements
    await query(sql);
    return new Response(JSON.stringify({ success: true, message: 'Migration executed' }));
  } catch (err: any) {
    console.error('Migration API error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Unknown error' }), { status: 500 });
  }
}
