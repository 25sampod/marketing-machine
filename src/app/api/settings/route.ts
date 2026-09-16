import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStudioSettings, clearSettingsCache } from '@/lib/settings';
import { syncRawKnowledgeToModular } from '@/lib/ai/knowledgeRetriever';

function maskSettingsForClient(settings: any) {
  return {
    ...settings,
    isWhatsAppConfigured: Boolean(settings.whatsappPhoneNumberId && settings.whatsappAccessToken),
    isAiConfigured: Boolean(settings.aiApiKey),
    isEmailConfigured: Boolean(settings.resendApiKey),
    isTelegramConfigured: Boolean(settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId),
    isFacebookConfigured: Boolean(settings.metaAppSecret && settings.whatsappPhoneNumberId),
    isInstagramConfigured: Boolean(settings.instagramEnabled && settings.instagramAccountId && settings.instagramPageAccessToken),
    isMessengerConfigured: Boolean(settings.messengerEnabled && settings.messengerPageId && settings.messengerPageAccessToken),

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
    aiEndpoint: settings.aiEndpoint ? '••••••••••••••••••••••••' : '',
    notificationEmail: settings.notificationEmail ? '••••••••••••••••' : '',
    instagramPageAccessToken: settings.instagramPageAccessToken ? '••••••••••••••••••••••••' : '',
    instagramAccountId: settings.instagramAccountId ? '••••••••••••••••' : '',
    instagramVerifyToken: settings.instagramVerifyToken ? '••••••••••••••••' : '',
    messengerPageAccessToken: settings.messengerPageAccessToken ? '••••••••••••••••••••••••' : '',
    messengerPageId: settings.messengerPageId ? '••••••••••••••••' : '',
    messengerVerifyToken: settings.messengerVerifyToken ? '••••••••••••••••' : '',
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId') || undefined;
    const teamId = searchParams.get('teamId') || undefined;

    const settings = await getStudioSettings({ studioId, teamId, forceRefresh: true });

    // If studio_settings in Postgres is unpopulated, proactively sync the active resolved credentials to the database
    const targetId = studioId || 'default';
    let existingQuery = supabaseAdmin
      .from('studio_settings')
      .select('id, whatsapp_phone_number_id, ai_api_key, resend_api_key');
    
    if (teamId) {
      existingQuery = existingQuery.eq('team_id', teamId);
    } else {
      existingQuery = existingQuery.eq('id', targetId);
    }

    const { data: existingRow } = await existingQuery.maybeSingle();

    if (!existingRow || (!existingRow.whatsapp_phone_number_id && !existingRow.ai_api_key)) {
      await supabaseAdmin
        .from('studio_settings')
        .upsert({
          id: targetId,
          ...(teamId ? { team_id: teamId } : {}),
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
          instagram_account_id: settings.instagramAccountId,
          instagram_page_access_token: settings.instagramPageAccessToken,
          instagram_verify_token: settings.instagramVerifyToken,
          instagram_enabled: settings.instagramEnabled,
          messenger_page_id: settings.messengerPageId,
          messenger_page_access_token: settings.messengerPageAccessToken,
          messenger_verify_token: settings.messengerVerifyToken,
          messenger_enabled: settings.messengerEnabled,
          auto_reply_enabled: settings.autoReplyEnabled,
          email_alerts_enabled: settings.emailAlertsEnabled,
          discovery_interviewer_enabled: settings.discoveryInterviewerEnabled,
          returning_client_mode: settings.returningClientMode || 'draft_only',
          time_format: settings.timeFormat || '12h',
          timezone: settings.timezone || 'auto',
          followup_interval_hours: settings.followupIntervalHours || 24,
          qualification_threshold: typeof settings.qualificationThreshold === 'number' ? settings.qualificationThreshold : 70,
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

    const targetId = body.studio_id || body.studioId || body.id || 'default';
    const targetTeamId = body.team_id || body.teamId || null;

    const payload: Record<string, any> = {
      id: targetId,
      updated_at: new Date().toISOString(),
    };

    if (targetTeamId) {
      payload.team_id = targetTeamId;
    }
    if (body.studio_name !== undefined || body.studioName !== undefined) {
      payload.studio_name = (body.studio_name ?? body.studioName)?.trim() || null;
    }
    if (body.studio_slug !== undefined || body.studioSlug !== undefined) {
      payload.studio_slug = (body.studio_slug ?? body.studioSlug)?.trim() || null;
    }

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
    if ('notification_email' in body) {
      if (!isMaskedOrPreserved(body.notification_email)) {
        payload.notification_email = body.notification_email?.trim() || null;
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

    // Instagram Direct
    if ('instagram_account_id' in body) {
      if (!isMaskedOrPreserved(body.instagram_account_id)) {
        payload.instagram_account_id = body.instagram_account_id?.trim() || null;
      }
    }
    if ('instagram_page_access_token' in body) {
      if (!isMaskedOrPreserved(body.instagram_page_access_token)) {
        payload.instagram_page_access_token = body.instagram_page_access_token?.trim() || null;
      }
    }
    if ('instagram_verify_token' in body) {
      if (!isMaskedOrPreserved(body.instagram_verify_token)) {
        payload.instagram_verify_token = body.instagram_verify_token?.trim() || null;
      }
    }
    if ('instagram_enabled' in body) {
      payload.instagram_enabled = Boolean(body.instagram_enabled);
    }

    // Facebook Messenger
    if ('messenger_page_id' in body) {
      if (!isMaskedOrPreserved(body.messenger_page_id)) {
        payload.messenger_page_id = body.messenger_page_id?.trim() || null;
      }
    }
    if ('messenger_page_access_token' in body) {
      if (!isMaskedOrPreserved(body.messenger_page_access_token)) {
        payload.messenger_page_access_token = body.messenger_page_access_token?.trim() || null;
      }
    }
    if ('messenger_verify_token' in body) {
      if (!isMaskedOrPreserved(body.messenger_verify_token)) {
        payload.messenger_verify_token = body.messenger_verify_token?.trim() || null;
      }
    }
    if ('messenger_enabled' in body) {
      payload.messenger_enabled = Boolean(body.messenger_enabled);
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
      const parsed = parseInt(String(body.qualification_threshold), 10);
      payload.qualification_threshold = isNaN(parsed) ? 70 : Math.min(100, Math.max(0, parsed));
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

    // Bidirectional sync: if knowledge_base was provided, sync to modular knowledge items
    if ('knowledge_base' in body) {
      try {
        await syncRawKnowledgeToModular(targetId, body.knowledge_base || '');
      } catch (syncErr) {
        console.warn('Failed to sync raw knowledge to modular in settings route:', syncErr);
      }
    }

    // Crucial: immediately clear server-side in-memory cache so subsequent calls reflect updates
    clearSettingsCache();
    const updatedSettings = await getStudioSettings({
      studioId: targetId,
      teamId: targetTeamId || undefined,
      forceRefresh: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Studio settings saved successfully.',
      settings: maskSettingsForClient(updatedSettings),
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
