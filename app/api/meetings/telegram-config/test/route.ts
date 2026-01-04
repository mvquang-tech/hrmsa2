import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth, getAuthUser } from '@/lib/middleware/auth';

// POST - Test gửi tin nhắn Telegram
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Lấy cấu hình Telegram của user
    const [config] = await query(
      'SELECT * FROM telegram_config WHERE userId = ?',
      [user.id]
    ) as any[];

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình Telegram. Vui lòng cấu hình trước.' },
        { status: 400 }
      );
    }

    // Gửi tin nhắn test
    const message = `🔔 *Test thông báo từ HRMS*\n\nKết nối Telegram thành công!\nThời gian: ${new Date().toLocaleString('vi-VN')}`;
    
    const telegramUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Lỗi Telegram: ${result.description || 'Không thể gửi tin nhắn'}` 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi tin nhắn test thành công! Vui lòng kiểm tra Telegram.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/meetings/telegram-config/test:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi test Telegram' },
      { status: 500 }
    );
  }
}
