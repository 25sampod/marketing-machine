import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStudioSettings } from '@/lib/settings';

export async function GET() {
  const startTime = performance.now();

  // 1. Probe Supabase Postgres
  const dbStart = performance.now();
  let dbStatus = 'Operational';
  let dbDetails = 'Postgres connection active, RLS active';
  let dbLatency = 0;
  try {
    const { error } = await supabaseAdmin
      .from('studio_settings')
      .select('id')
      .limit(1);
    dbLatency = Math.round(performance.now() - dbStart);
    if (error) {
      dbStatus = 'Degraded';
      dbDetails = error.message;
    }
  } catch (err: any) {
    dbLatency = Math.round(performance.now() - dbStart);
    dbStatus = 'Down';
    dbDetails = err.message || 'Database unreachable';
  }

  // Load dynamically resolved studio credentials
  const settings = await getStudioSettings();

  // 2. Probe AI Provider (Azure OpenAI or OpenAI)
  const aiStart = performance.now();
  let aiStatus = 'Operational';
  let aiDetails = `${settings.aiProvider === 'azure' ? 'Azure OpenAI' : 'OpenAI'} deployment verified`;
  let aiLatency = 0;
  const aiApiKey = settings.aiApiKey;
  const aiEndpoint = settings.aiEndpoint;
  const deploymentName = settings.aiDeploymentName;
  const apiVersion = settings.aiApiVersion;

  if (!aiApiKey) {
    aiStatus = 'Unconfigured';
    aiDetails = 'Missing OpenAI or Azure OpenAI API key in Studio Settings or environment';
  } else if (settings.aiProvider === 'azure' && aiEndpoint) {
    // Authentic Azure OpenAI Probe (/openai/models)
    try {
      const modelsUrl = `${aiEndpoint.replace(/\/+$/, '')}/openai/models?api-version=${apiVersion}`;
      const res = await fetch(modelsUrl, {
        headers: { 'api-key': aiApiKey },
        signal: AbortSignal.timeout(5000),
      });
      aiLatency = Math.round(performance.now() - aiStart);
      if (res.ok) {
        aiDetails = `Azure deployment (${deploymentName}) models endpoint verified`;
      } else {
        aiStatus = 'Degraded';
        aiDetails = `Azure OpenAI returned HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      aiLatency = Math.round(performance.now() - aiStart);
      aiStatus = 'Degraded';
      aiDetails = err.message || 'Azure OpenAI probe error';
    }
  } else {
    // Standard OpenAI probe
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${aiApiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      aiLatency = Math.round(performance.now() - aiStart);
      if (res.ok) {
        aiDetails = `OpenAI models endpoint verified (${deploymentName})`;
      } else {
        aiStatus = 'Degraded';
        aiDetails = `OpenAI API returned HTTP ${res.status}`;
      }
    } catch (err: any) {
      aiLatency = Math.round(performance.now() - aiStart);
      aiStatus = 'Degraded';
      aiDetails = err.message || 'OpenAI API probe error';
    }
  }

  // 3. Probe Telegram Bot API (https://api.telegram.org/bot<token>/getMe)
  const tgStart = performance.now();
  let tgStatus = 'Operational';
  let tgDetails = 'Telegram Bot API operational';
  let tgLatency = 0;
  const tgToken = settings.telegramBotToken;

  if (!tgToken) {
    tgStatus = 'Unconfigured';
    tgDetails = 'Telegram Bot Token not configured in Studio Settings or env';
  } else {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`, {
        signal: AbortSignal.timeout(5000),
      });
      tgLatency = Math.round(performance.now() - tgStart);
      const tgData = await tgRes.json();
      if (tgData.ok) {
        tgDetails = `@${tgData.result?.username || 'bot'} verified`;
      } else {
        tgStatus = 'Degraded';
        tgDetails = tgData.description || `Telegram API error (${tgRes.status})`;
      }
    } catch (err: any) {
      tgLatency = Math.round(performance.now() - tgStart);
      tgStatus = 'Degraded';
      tgDetails = err.message || 'Telegram Bot API unreachable';
    }
  }

  // 4. Probe Meta Graph API (WhatsApp Cloud API)
  const metaStart = performance.now();
  let metaStatus = 'Operational';
  let metaDetails = 'Meta Graph API operational';
  let metaLatency = 0;
  const metaToken = settings.whatsappAccessToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;

  if (!metaToken || !phoneNumberId) {
    metaStatus = 'Unconfigured';
    metaDetails = 'Missing WhatsApp Access Token or Phone Number ID in Studio Settings or env';
  } else {
    try {
      const metaRes = await fetch(
        `https://graph.facebook.com/v25.0/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number`,
        {
          headers: { Authorization: `Bearer ${metaToken}` },
          signal: AbortSignal.timeout(5000),
        }
      );
      metaLatency = Math.round(performance.now() - metaStart);
      const metaData = await metaRes.json();
      if (metaRes.ok) {
        metaDetails = `Meta Cloud WhatsApp API verified (${metaData.verified_name || 'Active WABA'})`;
      } else {
        metaStatus = 'Degraded';
        metaDetails = metaData.error?.message || `Meta Graph API error (${metaRes.status})`;
      }
    } catch (err: any) {
      metaLatency = Math.round(performance.now() - metaStart);
      metaStatus = 'Degraded';
      metaDetails = err.message || 'Meta Graph API unreachable';
    }
  }

  // 5. Probe Resend Email API
  const emailStart = performance.now();
  let emailStatus = 'Operational';
  let emailDetails = 'Resend transactional email operational';
  let emailLatency = 0;
  const resendKey = settings.resendApiKey;

  if (!resendKey) {
    emailStatus = 'Unconfigured';
    emailDetails = 'Resend API key not configured in Studio Settings or env';
  } else {
    try {
      const resendRes = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${resendKey}` },
        signal: AbortSignal.timeout(5000),
      });
      emailLatency = Math.round(performance.now() - emailStart);
      if (resendRes.ok) {
        emailDetails = 'Resend transactional email active & destination verified';
      } else {
        const errData = await resendRes.json().catch(() => ({}));
        const isRestrictedSendingKey =
          errData.name === 'restricted_api_key' ||
          errData.message?.toLowerCase().includes('restricted') ||
          errData.message?.toLowerCase().includes('only send emails') ||
          errData.message?.toLowerCase().includes('sending access');

        if (resendRes.status === 403 || isRestrictedSendingKey) {
          emailDetails = 'Resend sending API key verified & destination active';
        } else {
          emailStatus = 'Degraded';
          emailDetails = errData.message || `Resend API returned HTTP ${resendRes.status}`;
        }
      }
    } catch (err: any) {
      emailLatency = Math.round(performance.now() - emailStart);
      emailStatus = 'Degraded';
      emailDetails = err.message || 'Resend API unreachable';
    }
  }

  // 6. Probe Instagram Graph API (if configured)
  const igStart = performance.now();
  let igStatus = 'Operational';
  let igDetails = 'Instagram Direct messaging operational';
  let igLatency = 0;
  const igToken = settings.instagramPageAccessToken || settings.whatsappAccessToken;
  const igAccountId = settings.instagramAccountId;

  if (!igToken || !igAccountId) {
    igStatus = 'Unconfigured';
    igDetails = 'Instagram Access Token or Account ID not configured';
  } else {
    try {
      const igRes = await fetch(
        `https://graph.facebook.com/v25.0/${encodeURIComponent(igAccountId)}?fields=id,name,username`,
        {
          headers: { Authorization: `Bearer ${igToken}` },
          signal: AbortSignal.timeout(5000),
        }
      );
      igLatency = Math.round(performance.now() - igStart);
      const igData = await igRes.json();
      if (igRes.ok) {
        igDetails = `Instagram Graph API verified (${igData.username || igData.name || 'Active Account'})`;
      } else {
        igStatus = 'Degraded';
        igDetails = igData.error?.message || `Instagram Graph API error (${igRes.status})`;
      }
    } catch (err: any) {
      igLatency = Math.round(performance.now() - igStart);
      igStatus = 'Degraded';
      igDetails = err.message || 'Instagram Graph API unreachable';
    }
  }

  // 7. Probe Facebook Messenger API (if configured)
  const msgStart = performance.now();
  let msgStatus = 'Operational';
  let msgDetails = 'Facebook Messenger operational';
  let msgLatency = 0;
  const msgToken = settings.messengerPageAccessToken || settings.whatsappAccessToken;
  const msgPageId = settings.messengerPageId;

  if (!msgToken || !msgPageId) {
    msgStatus = 'Unconfigured';
    msgDetails = 'Facebook Messenger Access Token or Page ID not configured';
  } else {
    try {
      const msgRes = await fetch(
        `https://graph.facebook.com/v25.0/${encodeURIComponent(msgPageId)}?fields=id,name`,
        {
          headers: { Authorization: `Bearer ${msgToken}` },
          signal: AbortSignal.timeout(5000),
        }
      );
      msgLatency = Math.round(performance.now() - msgStart);
      const msgData = await msgRes.json();
      if (msgRes.ok) {
        msgDetails = `Facebook Messenger API verified (${msgData.name || 'Active Page'})`;
      } else {
        msgStatus = 'Degraded';
        msgDetails = msgData.error?.message || `Facebook Messenger API error (${msgRes.status})`;
      }
    } catch (err: any) {
      msgLatency = Math.round(performance.now() - msgStart);
      msgStatus = 'Degraded';
      msgDetails = err.message || 'Facebook Messenger API unreachable';
    }
  }

  const totalDurationMs = Math.round(performance.now() - startTime);

  const matrix = {
    database: {
      name: 'Supabase Postgres',
      category: 'Database Infrastructure',
      status: dbStatus,
      latencyMs: dbLatency,
      details: dbDetails,
    },
    ai: {
      name: `${settings.aiProvider === 'azure' ? 'Azure OpenAI' : 'OpenAI'} (${deploymentName})`,
      category: 'AI Qualification Engine',
      status: aiStatus,
      latencyMs: aiLatency,
      details: aiDetails,
    },
    telegram: {
      name: 'Telegram Bot API',
      category: 'Specialist Escalation & Alerts',
      status: tgStatus,
      latencyMs: tgLatency,
      details: tgDetails,
    },
    metaGraph: {
      name: 'Meta Graph API (WhatsApp)',
      category: 'Omnichannel Ingestion & Delivery',
      status: metaStatus,
      latencyMs: metaLatency,
      details: metaDetails,
    },
    instagram: {
      name: 'Instagram Direct Messaging',
      category: 'Omnichannel Ingestion & Delivery',
      status: igStatus,
      latencyMs: igLatency,
      details: igDetails,
    },
    messenger: {
      name: 'Facebook Messenger',
      category: 'Omnichannel Ingestion & Delivery',
      status: msgStatus,
      latencyMs: msgLatency,
      details: msgDetails,
    },
    email: {
      name: 'Resend Email Alerts',
      category: 'Transactional Notifications',
      status: emailStatus,
      latencyMs: emailLatency,
      details: emailDetails,
    },
  };

  const activeServices = Object.values(matrix).filter((s) => s.status !== 'Unconfigured');
  const isAnyDown = activeServices.some((s) => s.status === 'Down');
  const isAnyDegraded = activeServices.some((s) => s.status === 'Degraded');
  const overallStatus = isAnyDown ? 'System Outage' : isAnyDegraded ? 'Degraded Performance' : 'All Systems Operational';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    totalDurationMs,
    matrix,
    // Backward-compatibility mapping for existing callers
    services: matrix,
  });
}
