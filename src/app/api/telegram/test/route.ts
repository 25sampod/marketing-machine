import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/bot';
import { getStudioSettings } from '@/lib/settings';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getStudioSettings();
    const token = body.botToken || body.token || settings.telegramBotToken;
    const chatId = body.chatId || settings.telegramChatId;

    if (!token || !chatId) {
      return NextResponse.json({ error: 'Telegram Bot Token and Chat ID are required' }, { status: 400 });
    }

    const testText = `
✅ <b>ArchScale Studio Telegram Bot Connected!</b>

Your studio's instant lead notification channel is active.
🕒 <i>Timestamp: ${new Date().toLocaleString()}</i>
`.trim();

    const result = await sendTelegramMessage(testText, token, chatId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send test message' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Test message sent successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
