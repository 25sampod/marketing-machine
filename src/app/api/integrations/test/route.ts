import { NextResponse } from 'next/server';
import { getStudioSettings } from '@/lib/settings';
import OpenAI, { AzureOpenAI } from 'openai';
import { sendTelegramMessage } from '@/lib/telegram/bot';

function cleanCredential(input: any, fallback: string | null | undefined): string | null {
  if (input === undefined) return fallback || null;
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (s.includes('••') || s.includes('●●') || s.includes('(Configured') || s.includes('(Active')) {
    return fallback || null;
  }
  return s || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type, config } = body;
    const settings = await getStudioSettings();

    if (type === 'meta') {
      const phoneNumberId = cleanCredential(config?.phoneNumberId, settings.whatsappPhoneNumberId);
      const accessToken = cleanCredential(config?.accessToken, settings.whatsappAccessToken);

      if (!phoneNumberId || !accessToken) {
        return NextResponse.json({
          success: false,
          error: 'Phone Number ID and Access Token are required to test WhatsApp.',
        }, { status: 400 });
      }

      try {
        const res = await fetch(
          `https://graph.facebook.com/v25.0/${encodeURIComponent(phoneNumberId)}?fields=verified_name,code_verification_status,display_phone_number`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: AbortSignal.timeout(6000),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: data.error?.message || `Meta Graph API error (HTTP ${res.status})`,
          });
        }

        return NextResponse.json({
          success: true,
          message: `Connected to Meta Cloud API! Verified as: ${data.verified_name || data.display_phone_number || 'Phone Account Active'}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to connect to Meta Graph API.',
        });
      }
    }

    if (type === 'ai') {
      const provider = config?.provider || settings.aiProvider || 'azure';
      const apiKey = cleanCredential(config?.apiKey, settings.aiApiKey);
      const rawEndpoint = cleanCredential(config?.endpoint, settings.aiEndpoint);
      let endpoint = rawEndpoint ? rawEndpoint.replace(/\/+$/, '') : null;
      if (endpoint && !/^https?:\/\//i.test(endpoint)) {
        endpoint = `https://${endpoint}`;
      }
      const deploymentName = config?.deploymentName?.trim() || settings.aiDeploymentName || 'gpt-5-nano';
      const apiVersion = config?.apiVersion?.trim() || settings.aiApiVersion || '2024-12-01-preview';

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'AI API Key is required.',
        }, { status: 400 });
      }

      if (provider === 'azure') {
        if (!endpoint) {
          return NextResponse.json({
            success: false,
            error: 'Azure OpenAI requires an Endpoint URL.',
          }, { status: 400 });
        }

        try {
          const client = new AzureOpenAI({
            endpoint,
            apiKey,
            deployment: deploymentName,
            apiVersion,
          });

          // Lightweight completion probe
          const isReasoning = /^(o1|o3|gpt-5)/i.test(deploymentName);
          const req: any = {
            model: deploymentName,
            messages: [{ role: 'user', content: 'respond with "pong"' }],
            max_completion_tokens: 20,
          };
          if (isReasoning) req.reasoning_effort = 'low';

          const res = await (client.chat.completions.create as any)(req, {
            signal: AbortSignal.timeout(8000),
          });

          const reply = res.choices?.[0]?.message?.content?.trim() || 'pong';
          return NextResponse.json({
            success: true,
            message: `Connected to Azure OpenAI! Deployment (${deploymentName}) responded: "${reply}"`,
          });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            error: err.message || 'Azure OpenAI connection test failed.',
          });
        }
      } else {
        // OpenAI direct
        try {
          const client = new OpenAI({ apiKey });
          const res = await client.models.list({
            signal: AbortSignal.timeout(6000),
          });

          return NextResponse.json({
            success: true,
            message: `Connected to OpenAI! Successfully verified API key (${res.data?.length || 0} models available).`,
          });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            error: err.message || 'OpenAI API connection test failed.',
          });
        }
      }
    }

    if (type === 'telegram') {
      const token = cleanCredential(config?.botToken, settings.telegramBotToken);
      const chatId = cleanCredential(config?.chatId, settings.telegramChatId);

      if (!token || !chatId) {
        return NextResponse.json({
          success: false,
          error: 'Telegram Bot Token and Chat ID are required.',
        }, { status: 400 });
      }

      const testMsg = `
✅ <b>ArchScale Studio Connection Verified!</b>

Your studio integrations dashboard has successfully established a link with this Telegram channel.
🕒 <i>Timestamp: ${new Date().toLocaleString()}</i>
      `.trim();

      const res = await sendTelegramMessage(testMsg, token, chatId);
      if (!res.success) {
        return NextResponse.json({
          success: false,
          error: res.error || 'Failed to send Telegram test alert.',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Telegram test notification delivered successfully!',
      });
    }

    if (type === 'email') {
      const apiKey = cleanCredential(config?.apiKey, settings.resendApiKey);

      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'Resend API Key is required.',
        }, { status: 400 });
      }

      try {
        const res = await fetch('https://api.resend.com/api-keys', {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          // Resend restricted sending-only keys return an error message mentioning restricted sending or only send emails on /api-keys, which verifies the key is active and valid
          const isRestrictedSendingKey =
            errData.name === 'restricted_api_key' ||
            errData.message?.toLowerCase().includes('restricted') ||
            errData.message?.toLowerCase().includes('only send emails') ||
            errData.message?.toLowerCase().includes('sending access');

          if (isRestrictedSendingKey) {
            return NextResponse.json({
              success: true,
              message: 'Connected to Resend! Transactional email API key is valid (sending mode active).',
            });
          }
          return NextResponse.json({
            success: false,
            error: errData.message || `Resend API returned HTTP ${res.status}`,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Connected to Resend! Transactional email API key is valid.',
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to reach Resend API.',
        });
      }
    }

    if (type === 'discord') {
      const webhookUrl = config?.webhookUrl?.trim();
      if (!webhookUrl) {
        return NextResponse.json({
          success: false,
          error: 'Discord Webhook URL is required.',
        }, { status: 400 });
      }

      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Discord Webhook URL. Format: https://discord.com/api/webhooks/...',
        }, { status: 400 });
      }

      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '✅ **ArchScale Studio Integration Test**: Discord webhook connection verified successfully!',
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          return NextResponse.json({
            success: false,
            error: `Discord API returned HTTP ${res.status}`,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Discord test notification delivered successfully!',
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to reach Discord webhook.',
        });
      }
    }

    if (type === 'webhooks') {
      const targetUrl = config?.targetUrl?.trim();
      if (!targetUrl) {
        return NextResponse.json({
          success: false,
          error: 'Target Webhook URL is required.',
        }, { status: 400 });
      }

      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'integration.test',
            timestamp: new Date().toISOString(),
            studio: 'ArchScale Studio',
          }),
          signal: AbortSignal.timeout(6000),
        });

        return NextResponse.json({
          success: true,
          message: `Webhook endpoint responded with HTTP ${res.status}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to reach webhook URL.',
        });
      }
    }

    if (type === 'google') {
      const scriptUrl = config?.scriptUrl?.trim() || config?.targetUrl?.trim();
      if (!scriptUrl) {
        return NextResponse.json({
          success: false,
          error: 'Google Apps Script Webhook URL is required.',
        }, { status: 400 });
      }

      try {
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'integration.test',
            timestamp: new Date().toISOString(),
            test: true,
          }),
          signal: AbortSignal.timeout(6000),
        });

        return NextResponse.json({
          success: true,
          message: `Google Sheets endpoint responded with HTTP ${res.status}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message || 'Failed to reach Google Apps Script URL.',
        });
      }
    }

    return NextResponse.json({ error: 'Invalid integration type specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Integrations test handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
