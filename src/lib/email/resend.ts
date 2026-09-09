import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface LeadNotificationPayload {
  lead: {
    id?: string;
    name: string;
    contact: string;
    source?: string;
    message: string;
    project_type?: string;
    score?: number;
    assigned_to?: string;
    created_at?: string;
  };
  recipientEmail?: string;
  specialistEmail?: string;
}

export async function sendLeadQualifiedNotification({
  lead,
  recipientEmail,
  specialistEmail,
}: LeadNotificationPayload) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ArchScale <notifications@scale.sampod.site>';
  const toEmail = recipientEmail || specialistEmail || 'onboarding@resend.dev';

  if (!resend || !resendApiKey) {
    console.log('\n----------------------------------------');
    console.log('📧 [RESEND EMAIL DISPATCH]');
    console.log(`From: ${fromEmail}`);
    console.log(`To (Individual Google User): ${toEmail}`);
    if (specialistEmail && specialistEmail !== toEmail) console.log(`CC (Assigned Specialist): ${specialistEmail}`);
    console.log(`Subject: 🏛️ New Qualified Architectural Lead: ${lead.name} (${lead.project_type || 'Unspecified'})`);
    console.log(`Lead Contact: ${lead.contact}`);
    console.log(`Brief: "${lead.message}"`);
    console.log(`Assigned Partner: ${lead.assigned_to || 'Practice Lead'}`);
    console.log('----------------------------------------\n');
    return { success: true, simulated: true };
  }

  const cleanPhone = lead.contact.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Qualified Lead</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px 16px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #101726; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; border-bottom: 1px solid #1f293d; background: linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(15, 118, 110, 0.1));">
        <span style="display: inline-block; background-color: #ea580c; color: #ffffff; font-family: monospace; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
          AI Qualified Lead
        </span>
        <h1 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 12px 0 4px 0;">
          New Commission Inquiry: ${lead.name}
        </h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          Assigned to: <strong style="color: #ea580c;">${lead.assigned_to || 'Practice Partner'}</strong>
        </p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px; width: 120px;">Client Name</td>
            <td style="padding: 8px 0; color: #f8fafc; font-size: 13px; font-weight: 600;">${lead.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">WhatsApp Contact</td>
            <td style="padding: 8px 0; color: #38bdf8; font-size: 13px; font-family: monospace;">${lead.contact}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Typology</td>
            <td style="padding: 8px 0; color: #f8fafc; font-size: 13px;">${lead.project_type || 'Architectural Commission'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">AI Score</td>
            <td style="padding: 8px 0; color: #10b981; font-size: 13px; font-family: monospace; font-weight: bold;">
              ${lead.score ?? 2} / 2 (Budget & Scope Verified)
            </td>
          </tr>
        </table>

        <!-- Message Quote Box -->
        <div style="background-color: #0c1220; border-left: 3px solid #ea580c; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0; font-style: italic;">
            "${lead.message}"
          </p>
        </div>

        <!-- Action Button -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
                Open WhatsApp Conversation &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 24px; border-top: 1px solid #1f293d; background-color: #0c1220; text-align: center;">
        <p style="color: #64748b; font-size: 11px; margin: 0;">
          ArchScale Marketing Automation Machine · scale.sampod.site
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const ccList = specialistEmail && specialistEmail !== toEmail ? [specialistEmail] : [];

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      cc: ccList.length > 0 ? ccList : undefined,
      subject: `🏛️ Qualified Lead: ${lead.name} (${lead.project_type || 'Architectural Inquiry'})`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API dispatch error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send Resend email:', error);
    return { success: false, error };
  }
}
