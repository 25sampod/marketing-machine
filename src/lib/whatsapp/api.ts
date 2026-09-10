export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('WhatsApp credentials missing. Token or PhoneNumberId not configured.');
    return { success: false, error: 'WhatsApp credentials (token or phone ID) are not configured.' };
  }

  try {
    // Sanitize recipient: keep digits, strip punctuation and formatting
    const cleanTo = to.replace(/[^\d+]/g, '');

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

    return { success: true, data };
  } catch (error: any) {
    console.error('Failed to send WhatsApp message:', error);
    return { success: false, error: error?.message || 'Network error connecting to Meta WhatsApp API' };
  }
}
