import { getStudioSettings } from '../settings';

export interface TelegramAlertData {
  name: string;
  contact: string;
  projectType?: string | null;
  budget?: string | null;
  score?: number | null;
  priorityTier?: string | null;
  assignedSpecialist?: string | null;
  aiSummary?: string | null;
  leadId?: string;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(text: string, customToken?: string, customChatId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let token = customToken;
    let chatId = customChatId;

    if (!token || !chatId) {
      const settings = await getStudioSettings();

      if (!settings.telegramEnabled && !customToken) {
        return { success: false, error: 'Telegram notifications are disabled in Studio Settings.' };
      }

      token = token || settings.telegramBotToken || undefined;
      chatId = chatId || settings.telegramChatId || undefined;
    }

    if (!token || !chatId) {
      return { success: false, error: 'Missing Telegram Bot Token or Chat ID.' };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram API] Error sending message:', data);
      return { success: false, error: data.description || 'Failed to send Telegram message' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Telegram Bot] Exception:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Send a formatted high-priority lead notification to the Studio Telegram chat
 */
export async function sendTelegramLeadAlert(lead: TelegramAlertData): Promise<boolean> {
  const priorityEmoji =
    lead.priorityTier === 'urgent' ? '🚨' :
    lead.priorityTier === 'high' ? '🔥' :
    lead.priorityTier === 'medium' ? '⚡' : '📌';

  const scoreText = lead.score !== undefined && lead.score !== null ? `${lead.score}/100` : 'N/A';
  const tierText = (lead.priorityTier || 'QUALIFIED').toUpperCase();

  const message = `
${priorityEmoji} <b>NEW QUALIFIED STUDIO LEAD</b> ${priorityEmoji}

👤 <b>Client:</b> ${escapeHtml(lead.name || 'Anonymous Lead')}
📞 <b>Contact:</b> <code>${escapeHtml(lead.contact || 'N/A')}</code>
💼 <b>Scope:</b> ${escapeHtml(lead.projectType || 'Project Exploration')}
💰 <b>Budget:</b> ${escapeHtml(lead.budget || 'Pending confirmation')}
🎯 <b>Priority:</b> <b>${tierText}</b> (Score: ${scoreText})
🤝 <b>Assigned:</b> ${escapeHtml(lead.assignedSpecialist || 'Pending Assignment')}

📝 <b>Executive Brief:</b>
<i>${escapeHtml(lead.aiSummary || 'Client engaged with studio WhatsApp assistant.')}</i>

⚡ <i>Action required: Review lead details in Studio Dashboard.</i>
`.trim();

  const res = await sendTelegramMessage(message);
  return res.success;
}

/**
 * Send a cron follow-up digest to Telegram
 */
export async function sendTelegramFollowUpDigest(count: number, details?: string): Promise<boolean> {
  const message = `
🤖 <b>AUTOMATED FOLLOW-UP REPORT</b>

✅ Re-engagement messages dispatched: <b>${count}</b>
🕒 Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}

${details ? `<i>${escapeHtml(details)}</i>` : 'Stale leads re-engaged with personalized AI check-ins.'}
`.trim();

  const res = await sendTelegramMessage(message);
  return res.success;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
