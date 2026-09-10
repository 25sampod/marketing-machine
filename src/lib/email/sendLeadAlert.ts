import { Resend } from 'resend';
import { getStudioSettings } from '../settings';

export interface LeadAlertPayload {
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
  customApiKey?: string;
}

/**
 * Sends a qualified lead email alert using the dynamically resolved Resend API key
 * and studio notification email address from Studio Settings (or env fallback).
 */
export async function sendLeadAlert({
  lead,
  recipientEmail,
  specialistEmail,
  customApiKey,
}: LeadAlertPayload) {
  const settings = await getStudioSettings();
  const apiKey = customApiKey || settings.resendApiKey;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ArchScale <notifications@scale.sampod.site>';

  // Target notification email: studio_settings destination -> passed recipient -> specialist -> env fallback
  let candidateEmail: string | null | undefined = recipientEmail?.trim();
  if (!candidateEmail || !candidateEmail.includes('@')) {
    candidateEmail =
      settings.notificationEmail?.trim() ||
      (specialistEmail?.includes('@') ? specialistEmail.trim() : undefined) ||
      process.env.NOTIFICATION_EMAIL?.trim() ||
      process.env.PLATFORM_ADMIN_EMAIL?.trim() ||
      undefined;
  }

  if (!candidateEmail || !candidateEmail.includes('@')) {
    console.warn('[Resend] No valid recipient email address configured. Lead alert email not sent.');
    return { success: false, error: 'No valid recipient email address configured in Studio Settings or environment.' };
  }
  const toEmail = candidateEmail;

  if (!apiKey) {
    console.warn('[Resend] Resend API key not configured in Studio Settings or environment. Lead alert email not sent.');
    return { success: false, error: 'Resend API key is not configured in Studio Settings or environment.' };
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
          New Commission Inquiry: ${escapeHtml(lead.name)}
        </h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          Assigned to: <strong style="color: #ea580c;">${escapeHtml(lead.assigned_to || 'Practice Partner')}</strong>
        </p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px; width: 120px;">Client Name</td>
            <td style="padding: 8px 0; color: #f8fafc; font-size: 13px; font-weight: 600;">${escapeHtml(lead.name)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">WhatsApp Contact</td>
            <td style="padding: 8px 0; color: #38bdf8; font-size: 13px; font-family: monospace;">${escapeHtml(lead.contact)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">Typology</td>
            <td style="padding: 8px 0; color: #f8fafc; font-size: 13px;">${escapeHtml(lead.project_type || 'Architectural Commission')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 13px;">AI Score</td>
            <td style="padding: 8px 0; color: #10b981; font-size: 13px; font-family: monospace; font-weight: bold;">
              ${lead.score ?? 0} / 100 (Multi-Factor LPI)
            </td>
          </tr>
        </table>

        <!-- Message Quote Box -->
        <div style="background-color: #0c1220; border-left: 3px solid #ea580c; border-radius: 8px; padding: 14px; margin-bottom: 24px;">
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0; font-style: italic;">
            "${escapeHtml(lead.message)}"
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
  `.trim();

  try {
    const resend = new Resend(apiKey);
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
  } catch (error: any) {
    console.error('Failed to send Resend email:', error);
    return { success: false, error: error?.message || 'Email dispatch failed' };
  }
}

// Backward-compatible alias for existing callers
export const sendLeadQualifiedNotification = sendLeadAlert;

export interface ClientWelcomePayload {
  toEmail: string;
  clientName: string;
  projectType?: string;
  message?: string;
  specialistName?: string;
  studioName?: string;
  whatsappContact?: string;
  customApiKey?: string;
}

/**
 * Dispatches an automated, branded welcome confirmation email to prospective clients
 * who submit inquiries via web brief or email intake.
 */
export async function sendClientWelcomeEmail({
  toEmail,
  clientName,
  projectType,
  message,
  specialistName,
  studioName,
  whatsappContact,
  customApiKey,
}: ClientWelcomePayload) {
  const settings = await getStudioSettings();
  const apiKey = customApiKey || settings.resendApiKey;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'ArchScale <notifications@scale.sampod.site>';

  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, error: 'Invalid client email address.' };
  }

  if (!apiKey) {
    console.warn('[Resend] Resend API key not configured. Client welcome email skipped.');
    return { success: false, error: 'Resend API key is not configured.' };
  }

  const cleanPhone = (whatsappContact || '').replace(/[^0-9]/g, '');
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://scale.sampod.site';
  const effectiveStudioName = studioName || 'ArchScale Studio';
  const effectiveSpecialist = specialistName || 'Practice Principal';
  const safeProjectType = projectType || 'Architectural Commission';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inquiry Confirmation - ${escapeHtml(effectiveStudioName)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090d16; color: #f8fafc; padding: 24px 16px; margin: 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #101726; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; border-bottom: 1px solid #1f293d; background: linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(15, 118, 110, 0.1));">
        <span style="display: inline-block; background-color: #ea580c; color: #ffffff; font-family: monospace; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
          Inquiry Received
        </span>
        <h1 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 12px 0 4px 0;">
          Welcome to ${escapeHtml(effectiveStudioName)}
        </h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          Thank you, ${escapeHtml(clientName)}. We have received your project brief.
        </p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
          Our practice has logged your inquiry regarding <strong>${escapeHtml(safeProjectType)}</strong>. Our team is currently reviewing your parameters and preliminary scope.
        </p>

        <div style="background-color: #0c1220; border: 1px solid #1f293d; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-size: 12px; width: 140px;">Assigned Specialist:</td>
              <td style="padding: 6px 0; color: #f8fafc; font-size: 12px; font-weight: 600;">${escapeHtml(effectiveSpecialist)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Project Focus:</td>
              <td style="padding: 6px 0; color: #f8fafc; font-size: 12px;">${escapeHtml(safeProjectType)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; font-size: 12px;">Status:</td>
              <td style="padding: 6px 0; color: #10b981; font-size: 12px; font-weight: 600;">In Concept Review</td>
            </tr>
          </table>
        </div>

        ${message ? `
        <div style="background-color: #0c1220; border-left: 3px solid #ea580c; border-radius: 8px; padding: 12px 14px; margin-bottom: 24px;">
          <p style="color: #94a3b8; font-size: 11px; font-family: monospace; margin: 0 0 4px 0; text-transform: uppercase;">Your Submitted Brief:</p>
          <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 0; font-style: italic;">
            "${escapeHtml(message)}"
          </p>
        </div>` : ''}

        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
          Need immediate consultation or wish to share architectural drawings? You can connect directly with our studio via WhatsApp:
        </p>

        <!-- CTA Button -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                Chat Directly on WhatsApp &rarr;
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
          ${escapeHtml(effectiveStudioName)} · Intelligent Marketing Automation Pipeline
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `🏛️ Thank you for your inquiry — ${effectiveStudioName}`,
      html: htmlContent,
    });

    if (error) {
      console.error('[Resend] Client welcome email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[Resend] Failed to send client welcome email:', error);
    return { success: false, error: error?.message || 'Email dispatch failed' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
