import { getStudioSettings } from '../settings';

export interface WhatsAppSendOptions {
  token?: string;
  phoneNumberId?: string;
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
  options?: WhatsAppSendOptions
) {
  const settings = await getStudioSettings();
  const token = options?.token || settings.whatsappAccessToken;
  const phoneNumberId = options?.phoneNumberId || settings.whatsappPhoneNumberId;

  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing. Token or PhoneNumberId not configured.');
    return { success: false, error: 'WhatsApp credentials (token or phone ID) are not configured in Studio Settings or environment.' };
  }

  try {
    // Sanitize recipient: Meta WhatsApp Cloud API requires international digits without leading '+' or symbols
    const cleanTo = to.replace(/\D/g, '');

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      const errMsg = data.error?.message || data.error?.error_user_msg || `Meta WhatsApp API error (${response.status})`;
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id || null;
    return { success: true, data, messageId };
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error);
    return { success: false, error: error?.message || 'Network error connecting to Meta WhatsApp API' };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName?: string,
  languageCode: string = 'en_US',
  components?: any[],
  options?: WhatsAppSendOptions
) {
  const settings = await getStudioSettings();
  const token = options?.token || settings.whatsappAccessToken;
  const phoneNumberId = options?.phoneNumberId || settings.whatsappPhoneNumberId;
  const resolvedTemplateName = templateName || settings.whatsappFollowupTemplateName || 'lead_reengagement';

  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing. Token or PhoneNumberId not configured.');
    return { success: false, error: 'WhatsApp credentials (token or phone ID) are not configured in Studio Settings or environment.' };
  }

  try {
    const cleanTo = to.replace(/\D/g, '');

    const bodyPayload: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'template',
      template: {
        name: resolvedTemplateName,
        language: {
          code: languageCode,
        },
      },
    };

    if (components && components.length > 0) {
      bodyPayload.template.components = components;
    }

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp Template Error:', data);
      const errMsg = data.error?.message || data.error?.error_user_msg || `Meta WhatsApp Template API error (${response.status})`;
      return { success: false, error: errMsg };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send WhatsApp template:', error);
    return { success: false, error: error?.message || 'Network error connecting to Meta WhatsApp API' };
  }
}

/**
 * Triggers Meta WhatsApp Cloud API native typing indicator.
 * Displays "typing..." in WhatsApp on the client's phone for up to 25s
 * until the actual automated message is delivered.
 */
export async function sendWhatsAppTypingIndicator(
  messageId: string,
  options?: WhatsAppSendOptions
) {
  const settings = await getStudioSettings();
  const token = options?.token || settings.whatsappAccessToken;
  const phoneNumberId = options?.phoneNumberId || settings.whatsappPhoneNumberId;

  if (!token || !phoneNumberId || !messageId) {
    return { success: false, error: 'Missing token, phone ID, or messageId' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
          typing_indicator: {
            type: 'text',
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.warn('[WhatsApp Typing Indicator] Meta API response:', data?.error?.message || response.status);
      return { success: false, error: data?.error?.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.warn('[WhatsApp Typing Indicator] Failed to trigger indicator:', error?.message);
    return { success: false, error: error?.message };
  }
}
