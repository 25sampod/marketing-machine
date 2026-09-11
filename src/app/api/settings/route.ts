import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStudioSettings, clearSettingsCache } from '@/lib/settings';

function maskSettingsForClient(settings: any) {
  return {
    ...settings,
    isWhatsAppConfigured: Boolean(settings.whatsappPhoneNumberId && settings.whatsappAccessToken),
    isAiConfigured: Boolean(settings.aiApiKey),
    isEmailConfigured: Boolean(settings.resendApiKey),
    isTelegramConfigured: Boolean(settings.telegramBotToken && settings.telegramChatId),
    isFacebookConfigured: Boolean(settings.metaAppSecret && settings.whatsappPhoneNumberId),

    // Mask ALL secret keys and account IDs completely - zero numbers or characters revealed
    whatsappAccessToken: settings.whatsappAccessToken ? '••••••••••••••••••••••••' : '',
    metaAppSecret: settings.metaAppSecret ? '••••••••••••••••' : '',
    whatsappVerifyToken: settings.whatsappVerifyToken ? '••••••••••••••••' : '',
    aiApiKey: settings.aiApiKey ? '••••••••••••••••••••••••' : '',
    resendApiKey: settings.resendApiKey ? '••••••••••••••••••••••••' : '',
    telegramBotToken: settings.telegramBotToken ? '••••••••••••••••••••••••' : '',
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId ? '••••••••••••••••' : '',
    whatsappBusinessAccountId: settings.whatsappBusinessAccountId ? '••••••••••••••••' : '',
    telegramChatId: settings.telegramChatId ? '••••••••••••••••' : '',
  };
}

function isMaskedOrPreserved(val: any): boolean {
  if (!val || typeof val !== 'string') return true;
  const s = val.trim();
  return (
    s === '' ||
    s.includes('••') ||
    s.includes('●●') ||
    s.includes('(Configured') ||
    s.includes('(Active')
  );
}

export async function GET() {
  try {
    const settings = await getStudioSettings(true);

    // If studio_settings in Postgres is unpopulated, proactively sync the active resolved credentials to the database
    const { data: existingRow } = await supabaseAdmin
      .from('studio_settings')
      .select('id, whatsapp_phone_number_id, ai_api_key, resend_api_key')
      .eq('id', 'default')
      .maybeSingle();

    if (!existingRow || (!existingRow.whatsapp_phone_number_id && !existingRow.ai_api_key)) {
      await supabaseAdmin
        .from('studio_settings')
        .upsert({
          id: 'default',
          whatsapp_phone_number_id: settings.whatsappPhoneNumberId,
          whatsapp_access_token: settings.whatsappAccessToken,
          whatsapp_business_account_id: settings.whatsappBusinessAccountId,
          meta_app_secret: settings.metaAppSecret,
          whatsapp_verify_token: settings.whatsappVerifyToken,
          whatsapp_followup_template_name: settings.whatsappFollowupTemplateName || 'lead_reengagement',
          ai_provider: settings.aiProvider || 'azure',
          ai_api_key: settings.aiApiKey,
          ai_endpoint: settings.aiEndpoint,
          ai_deployment_name: settings.aiDeploymentName || 'gpt-5-nano',
          ai_api_version: settings.aiApiVersion || '2024-12-01-preview',
          resend_api_key: settings.resendApiKey,
          notification_email: settings.notificationEmail,
          telegram_bot_token: settings.telegramBotToken,
          telegram_chat_id: settings.telegramChatId,
          telegram_enabled: settings.telegramEnabled,
          auto_reply_enabled: settings.autoReplyEnabled,
          email_alerts_enabled: settings.emailAlertsEnabled,
          discovery_interviewer_enabled: settings.discoveryInterviewerEnabled,
          returning_client_mode: settings.returningClientMode || 'draft_only',
          time_format: settings.timeFormat || '12h',
          timezone: settings.timezone || 'auto',
          followup_interval_hours: settings.followupIntervalHours || 24,
          qualification_threshold: settings.qualificationThreshold || 70,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    }

    return NextResponse.json({ success: true, settings: maskSettingsForClient(settings) });
  } catch (err: any) {
    console.error('Failed to get studio settings:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Normalize endpoint URL if provided
    let normalizedEndpoint: string | null = null;
    if (body.ai_endpoint) {
      const ep = String(body.ai_endpoint).trim().replace(/\/+$/, '');
      if (ep) {
        normalizedEndpoint = /^https?:\/\//i.test(ep) ? ep : `https://${ep}`;
      }
    }

    const payload: Record<string, any> = {
      id: 'default',
      updated_at: new Date().toISOString(),
    };

    // Meta WhatsApp Cloud API credentials
    if ('whatsapp_phone_number_id' in body) {
      if (!isMaskedOrPreserved(body.whatsapp_phone_number_id)) {
        payload.whatsapp_phone_number_id = body.whatsapp_phone_number_id.trim();
      }
    }
    if ('whatsapp_access_token' in body) {
      if (!isMaskedOrPreserved(body.whatsapp_access_token)) {
        payload.whatsapp_access_token = body.whatsapp_access_token.trim();
      }
    }
    if ('whatsapp_business_account_id' in body) {
      if (!isMaskedOrPreserved(body.whatsapp_business_account_id)) {
        payload.whatsapp_business_account_id = body.whatsapp_business_account_id.trim();
      }
    }
    if ('meta_app_secret' in body) {
      if (!isMaskedOrPreserved(body.meta_app_secret)) {
        payload.meta_app_secret = body.meta_app_secret.trim();
      }
    }
    if ('whatsapp_verify_token' in body) {
      if (!isMaskedOrPreserved(body.whatsapp_verify_token)) {
        payload.whatsapp_verify_token = body.whatsapp_verify_token.trim();
      }
    }
    if ('whatsapp_followup_template_name' in body) {
      payload.whatsapp_followup_template_name = body.whatsapp_followup_template_name?.trim() || 'lead_reengagement';
    }

    // AI Model Provider
    if ('ai_provider' in body) {
      payload.ai_provider = body.ai_provider === 'openai' ? 'openai' : 'azure';
    }
    if ('ai_api_key' in body) {
      if (!isMaskedOrPreserved(body.ai_api_key)) {
        payload.ai_api_key = body.ai_api_key.trim();
      }
    }
    if ('ai_endpoint' in body && body.ai_endpoint) {
      if (!isMaskedOrPreserved(body.ai_endpoint)) {
        payload.ai_endpoint = normalizedEndpoint;
      }
    }
    if ('ai_deployment_name' in body) {
      payload.ai_deployment_name = body.ai_deployment_name?.trim() || (payload.ai_provider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano');
    }
    if ('ai_api_version' in body) {
      payload.ai_api_version = body.ai_api_version?.trim() || '2024-12-01-preview';
    }

    // Email Alerts (Resend)
    if ('resend_api_key' in body) {
      if (!isMaskedOrPreserved(body.resend_api_key)) {
        payload.resend_api_key = body.resend_api_key.trim();
      }
    }
    if ('notification_email' in body && body.notification_email) {
      if (!isMaskedOrPreserved(body.notification_email)) {
        payload.notification_email = body.notification_email.trim();
      }
    }

    // Telegram Broadcast Bot
    if ('telegram_bot_token' in body) {
      if (!isMaskedOrPreserved(body.telegram_bot_token)) {
        payload.telegram_bot_token = body.telegram_bot_token.trim();
      }
    }
    if ('telegram_chat_id' in body) {
      if (!isMaskedOrPreserved(body.telegram_chat_id)) {
        payload.telegram_chat_id = body.telegram_chat_id.trim();
      }
    }
    if ('telegram_enabled' in body) {
      payload.telegram_enabled = Boolean(body.telegram_enabled);
    }

    // Automation toggles & settings
    if ('auto_reply_enabled' in body) {
      payload.auto_reply_enabled = Boolean(body.auto_reply_enabled);
    }
    if ('email_alerts_enabled' in body) {
      payload.email_alerts_enabled = Boolean(body.email_alerts_enabled);
    }
    if ('discovery_interviewer_enabled' in body) {
      payload.discovery_interviewer_enabled = Boolean(body.discovery_interviewer_enabled);
    }
    if ('returning_client_mode' in body) {
      payload.returning_client_mode = body.returning_client_mode;
    }
    if ('time_format' in body) {
      payload.time_format = body.time_format === '24h' ? '24h' : '12h';
    }
    if ('timezone' in body) {
      payload.timezone = body.timezone || 'auto';
    }
    if ('followup_interval_hours' in body) {
      payload.followup_interval_hours = Number(body.followup_interval_hours) || 24;
    }
    if ('knowledge_base' in body) {
      payload.knowledge_base = body.knowledge_base || null;
    }
    if ('qualification_threshold' in body) {
      payload.qualification_threshold = Math.min(100, Math.max(0, parseInt(String(body.qualification_threshold), 10) || 70));
    }

    const { data, error } = await supabaseAdmin
      .from('studio_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Failed to upsert studio_settings via admin:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Crucial: immediately clear server-side in-memory cache so subsequent calls reflect updates
    clearSettingsCache();
    const updatedSettings = await getStudioSettings(true);

    return NextResponse.json({
      success: true,
      message: 'Studio settings saved successfully.',
      settings: maskSettingsForClient(updatedSettings),
      record: data,
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
