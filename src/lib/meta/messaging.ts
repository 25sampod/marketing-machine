import { getStudioSettings } from '../settings';

export interface MetaSendOptions {
  channel: 'instagram' | 'messenger';
  token?: string;
  pageId?: string;
}

/**
 * Dispatches an outbound direct message via Meta Graph API for Instagram Direct or Facebook Messenger.
 */
export async function sendMetaDirectMessage(
  recipientId: string,
  text: string,
  options: MetaSendOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!recipientId || !text) {
    return { success: false, error: 'Recipient ID and message text are required.' };
  }

  const settings = await getStudioSettings();
  const isInstagram = options.channel === 'instagram';

  const token =
    options.token ||
    (isInstagram ? settings.instagramPageAccessToken : settings.messengerPageAccessToken) ||
    settings.whatsappAccessToken;

  const targetId =
    options.pageId ||
    (isInstagram ? settings.instagramAccountId : settings.messengerPageId) ||
    'me';

  if (!token) {
    const channelName = isInstagram ? 'Instagram Direct' : 'Facebook Messenger';
    return {
      success: false,
      error: `${channelName} access token is not configured in Studio Settings or environment.`,
    };
  }

  try {
    const endpoint = `https://graph.facebook.com/v25.0/${encodeURIComponent(targetId)}/messages`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`[Meta ${options.channel}] API Error:`, data);
      const errMsg = data.error?.message || data.error?.error_user_msg || `Meta Graph API error (${response.status})`;
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      messageId: data.message_id || data.id,
    };
  } catch (err: any) {
    console.error(`[Meta ${options.channel}] Dispatch Exception:`, err);
    return { success: false, error: err?.message || 'Network error delivering Meta message.' };
  }
}

/**
 * Dispatches typing indicator for Instagram Direct or Facebook Messenger.
 */
export async function sendMetaTypingIndicator(
  recipientId: string,
  options: MetaSendOptions,
  action: 'typing_on' | 'typing_off' = 'typing_on'
): Promise<boolean> {
  const settings = await getStudioSettings();
  const isInstagram = options.channel === 'instagram';
  const token =
    options.token ||
    (isInstagram ? settings.instagramPageAccessToken : settings.messengerPageAccessToken) ||
    settings.whatsappAccessToken;
  const targetId =
    options.pageId ||
    (isInstagram ? settings.instagramAccountId : settings.messengerPageId) ||
    'me';

  if (!token) return false;

  try {
    const endpoint = `https://graph.facebook.com/v25.0/${encodeURIComponent(targetId)}/messages`;
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: action,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return true;
  } catch {
    return false;
  }
}
