import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStudioSettings, clearSettingsCache } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await getStudioSettings(true);
    return NextResponse.json({ success: true, settings });
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
      payload.whatsapp_phone_number_id = body.whatsapp_phone_number_id?.trim() || null;
    }
    if ('whatsapp_access_token' in body) {
      payload.whatsapp_access_token = body.whatsapp_access_token?.trim() || null;
    }
    if ('whatsapp_business_account_id' in body) {
      payload.whatsapp_business_account_id = body.whatsapp_business_account_id?.trim() || null;
    }
    if ('meta_app_secret' in body) {
      payload.meta_app_secret = body.meta_app_secret?.trim() || null;
    }
    if ('whatsapp_verify_token' in body) {
      payload.whatsapp_verify_token = body.whatsapp_verify_token?.trim() || null;
    }
    if ('whatsapp_followup_template_name' in body) {
      payload.whatsapp_followup_template_name = body.whatsapp_followup_template_name?.trim() || 'lead_reengagement';
    }

    // AI Model Provider
    if ('ai_provider' in body) {
      payload.ai_provider = body.ai_provider === 'openai' ? 'openai' : 'azure';
    }
    if ('ai_api_key' in body) {
      payload.ai_api_key = body.ai_api_key?.trim() || null;
    }
    if ('ai_endpoint' in body) {
      payload.ai_endpoint = normalizedEndpoint;
    }
    if ('ai_deployment_name' in body) {
      payload.ai_deployment_name = body.ai_deployment_name?.trim() || (payload.ai_provider === 'openai' ? 'gpt-4o-mini' : 'gpt-5-nano');
    }
    if ('ai_api_version' in body) {
      payload.ai_api_version = body.ai_api_version?.trim() || '2024-12-01-preview';
    }

    // Email Alerts (Resend)
    if ('resend_api_key' in body) {
      payload.resend_api_key = body.resend_api_key?.trim() || null;
    }
    if ('notification_email' in body) {
      payload.notification_email = body.notification_email?.trim() || null;
    }

    // Telegram Broadcast Bot
    if ('telegram_bot_token' in body) {
      payload.telegram_bot_token = body.telegram_bot_token?.trim() || null;
    }
    if ('telegram_chat_id' in body) {
      payload.telegram_chat_id = body.telegram_chat_id?.trim() || null;
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
      settings: updatedSettings,
      record: data,
    });
  } catch (err: any) {
    console.error('Settings update error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
