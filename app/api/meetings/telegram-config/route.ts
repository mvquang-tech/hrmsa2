import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser, checkPermission } from '@/lib/middleware/auth';
import { z } from 'zod';

const telegramConfigSchema = z.object({
  botToken: z.string().min(1, 'Bot Token không được để trống'),
  chatId: z.string().min(1, 'Chat ID không được để trống'),
  enabled: z.boolean().default(true),
});

// GET - Lấy cấu hình Telegram của user
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [config] = await query(
      'SELECT * FROM telegram_config WHERE userId = ?',
      [user.id]
    ) as any[];

    return NextResponse.json({
      success: true,
      data: config || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/meetings/telegram-config:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lấy cấu hình Telegram' },
      { status: 500 }
    );
  }
}

// PUT - Cập nhật/Tạo cấu hình Telegram
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = telegramConfigSchema.parse(body);

    // Kiểm tra config đã tồn tại chưa
    const [existing] = await query(
      'SELECT * FROM telegram_config WHERE userId = ?',
      [user.id]
    ) as any[];

    if (existing) {
      // Cập nhật
      await query(`
        UPDATE telegram_config 
        SET botToken = ?, chatId = ?, enabled = ?
        WHERE userId = ?
      `, [validated.botToken, validated.chatId, validated.enabled ? 1 : 0, user.id]);
    } else {
      // Tạo mới
      await query(`
        INSERT INTO telegram_config (userId, botToken, chatId, enabled)
        VALUES (?, ?, ?, ?)
      `, [user.id, validated.botToken, validated.chatId, validated.enabled ? 1 : 0]);
    }

    // Lấy config đã cập nhật
    const [updated] = await query(
      'SELECT * FROM telegram_config WHERE userId = ?',
      [user.id]
    ) as any[];

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Đã lưu cấu hình Telegram',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/meetings/telegram-config:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi lưu cấu hình Telegram' },
      { status: 500 }
    );
  }
}
