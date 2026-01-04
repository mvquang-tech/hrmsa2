import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET - Cron job gửi nhắc nhở lịch họp
// Có thể gọi từ cron service bên ngoài như Vercel Cron, GitHub Actions, etc.
export async function GET(request: NextRequest) {
  try {
    // Optional: Kiểm tra cron secret để bảo mật
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const results: any[] = [];

    // Lấy các cuộc họp cần nhắc nhở
    // - reminderEnabled = true
    // - reminderSent = false
    // - Thời gian họp trong tương lai
    // - Thời gian hiện tại >= thời gian họp - reminderMinutes
    const meetings = await query(`
      SELECT m.*, 
             tc.botToken, tc.chatId, tc.enabled as telegramEnabled,
             CONCAT(e.firstName, ' ', e.lastName) as creatorName,
             u.id as userId
      FROM meetings m
      JOIN employees e ON m.createdBy = e.id
      JOIN users u ON e.id = u.employeeId
      LEFT JOIN telegram_config tc ON tc.userId = u.id
      WHERE m.reminderEnabled = 1 
        AND m.reminderSent = 0
        AND CONCAT(m.date, ' ', m.time) > NOW()
        AND DATE_SUB(CONCAT(m.date, ' ', m.time), INTERVAL m.reminderMinutes MINUTE) <= NOW()
    `) as any[];

    for (const meeting of meetings) {
      try {
        // Kiểm tra có cấu hình Telegram không
        if (!meeting.botToken || !meeting.chatId || !meeting.telegramEnabled) {
          results.push({
            meetingId: meeting.id,
            status: 'skipped',
            reason: 'Telegram not configured or disabled',
          });
          continue;
        }

        // Format tin nhắn
        const meetingTime = `${meeting.date} ${meeting.time}`;
        const message = formatReminderMessage(meeting);

        // Gửi qua Telegram
        const telegramUrl = `https://api.telegram.org/bot${meeting.botToken}/sendMessage`;
        
        const response = await fetch(telegramUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: meeting.chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });

        const telegramResult = await response.json();

        if (telegramResult.ok) {
          // Cập nhật reminderSent = true
          await query(
            'UPDATE meetings SET reminderSent = 1 WHERE id = ?',
            [meeting.id]
          );

          // Ghi log thành công
          await query(`
            INSERT INTO notification_logs (meetingId, status, sentAt)
            VALUES (?, 'sent', NOW())
          `, [meeting.id]);

          results.push({
            meetingId: meeting.id,
            title: meeting.title,
            status: 'sent',
          });
        } else {
          // Ghi log lỗi
          await query(`
            INSERT INTO notification_logs (meetingId, status, error, sentAt)
            VALUES (?, 'failed', ?, NOW())
          `, [meeting.id, telegramResult.description || 'Unknown error']);

          results.push({
            meetingId: meeting.id,
            title: meeting.title,
            status: 'failed',
            error: telegramResult.description,
          });
        }
      } catch (err: any) {
        // Ghi log exception
        await query(`
          INSERT INTO notification_logs (meetingId, status, error, sentAt)
          VALUES (?, 'failed', ?, NOW())
        `, [meeting.id, err.message]);

        results.push({
          meetingId: meeting.id,
          status: 'error',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error in GET /api/meetings/send-reminders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi gửi nhắc nhở' },
      { status: 500 }
    );
  }
}

function formatReminderMessage(meeting: any): string {
  const lines = [
    `🔔 *NHẮC NHỞ LỊCH HỌP*`,
    ``,
    `📋 *${meeting.title}*`,
    `📅 Ngày: ${formatDate(meeting.date)}`,
    `⏰ Giờ: ${meeting.time}`,
    `⏱️ Thời lượng: ${meeting.duration} phút`,
  ];

  if (meeting.location) {
    lines.push(`📍 Địa điểm: ${meeting.location}`);
  }

  if (meeting.attendees) {
    lines.push(`👥 Tham dự: ${meeting.attendees}`);
  }

  if (meeting.notes) {
    lines.push(``, `📝 *Ghi chú:*`, meeting.notes);
  }

  lines.push(``, `_Còn ${meeting.reminderMinutes} phút nữa cuộc họp sẽ bắt đầu!_`);

  return lines.join('\n');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
