export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.warn('WhatsApp credentials missing. Simulating sending message to:', to);
    console.log('Message:', text);
    return { success: true, simulated: true };
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
      throw new Error(`WhatsApp API failed: ${data.error?.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return { success: false, error };
  }
}
