import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/api';
import { sendTelegramFollowUpDigest } from '@/lib/telegram/bot';
import { getStudioSettings } from '@/lib/settings';
import { createAiClient } from '@/lib/ai/qualifyLead';

async function generateContextualFollowUp(lead: any, pastMessages: Array<{ direction: string; content: string }>): Promise<string> {
  const settings = await getStudioSettings();
  const aiSetup = createAiClient(settings);

  if (!aiSetup) {
    return `Hi ${lead.name || 'there'}, our senior team was reviewing your ${lead.project_type || 'project'} brief. Would you like to schedule a 15-minute concept review this week?`;
  }

  try {
    const modelName = aiSetup.modelName;
    const isReasoningModel = /^(o1|o3|gpt-5)/i.test(modelName);

    const recentTranscript = pastMessages
      .map((m) => `${m.direction === 'outbound' ? 'Studio' : 'Client'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a senior team consultant at our architecture & digital design studio following up with a prospective client on WhatsApp who hasn't replied recently.

CLIENT DETAILS:
- Name: ${lead.name || 'Client'}
- Project: ${lead.project_type || 'Custom Studio Project'}
- Budget: ${lead.estimated_budget || 'Pending'}
- Stage: ${lead.discovery_stage || 'discovery'}

RECENT CONVERSATION:
${recentTranscript || 'Client showed initial interest in studio services.'}

INSTRUCTION:
Write a warm, concise, and professional follow-up message (strict limit: 25-45 words).
Reference what they previously inquired about.
Ask a clear, low-pressure question to help them take the next step or book a concept review.
Speak as a human studio teammate ("we", "our team"). Do NOT sound like an automated bot.
Respond with ONLY the message text.`;

    const requestPayload: any = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_completion_tokens: 250,
    };

    if (isReasoningModel) {
      requestPayload.reasoning_effort = 'low';
    }

    const res = await (aiSetup.client.chat.completions.create as any)(requestPayload);

    const reply = res.choices?.[0]?.message?.content?.trim();
    return reply || `Hi ${lead.name || 'there'}! Following up on your ${lead.project_type || 'project'}—did you have any questions on the scope or timeline for our team?`;
  } catch (err) {
    console.error('Error generating AI follow-up:', err);
    return `Hi ${lead.name || 'there'}! Following up on your ${lead.project_type || 'project'}—did you have any questions on the scope or timeline for our team?`;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Read studio settings for follow-up window
    const { data: settings } = await supabaseAdmin
      .from('studio_settings')
      .select('followup_interval_hours, auto_reply_enabled')
      .eq('id', 'default')
      .maybeSingle();

    const hours = settings?.followup_interval_hours || 24;
    const thresholdDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // 2. Fetch stale leads that haven't been contacted since thresholdDate
    const { data: staleLeads, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, contact, source, project_type, estimated_budget, discovery_stage, status, created_at')
      .in('status', ['new', 'qualified', 'contacted'])
      .lt('last_contacted_at', thresholdDate)
      .limit(10);

    if (error) {
      console.error('Error fetching stale leads:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!staleLeads || staleLeads.length === 0) {
      return NextResponse.json({ success: true, message: 'No stale leads found within threshold.', processedCount: 0 });
    }

    let followUpCount = 0;

    for (const lead of staleLeads) {
      // Check explicit stop conditions: already converted/won or archived
      if (['converted', 'lost', 'dead'].includes(lead.status)) {
        continue;
      }

      // Fetch recent messages for context
      const { data: pastMsgs } = await supabaseAdmin
        .from('messages')
        .select('direction, content, sent_at')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(10);

      const ordered = pastMsgs ? [...pastMsgs].reverse() : [];

      // Stop condition: client opted out
      const isOptedOut = ordered.some(
        (m) => m.direction === 'inbound' && /\b(stop|unsubscribe|cancel|optout|quit)\b/i.test(m.content)
      );
      if (isOptedOut) {
        console.log(`[Follow-Up Cron] Lead ${lead.id} opted out. Skipping automation.`);
        continue;
      }

      // Stop condition: maximum follow-up attempts reached (3 studio follow-ups without client reply)
      const consecutiveOutbounds = ordered
        .slice()
        .reverse()
        .findIndex((m) => m.direction === 'inbound');
      if (consecutiveOutbounds >= 3) {
        console.log(`[Follow-Up Cron] Lead ${lead.id} reached maximum follow-up threshold (3 attempts). Halting cadence.`);
        continue;
      }

      // Meta 24-Hour Messaging Window Compliance Check:
      // A customer service window exists ONLY after a customer inbound message.
      const lastInbound = ordered.slice().reverse().find((m) => m.direction === 'inbound');
      let elapsedHoursSinceInbound = 999;
      let isOutside24hWindow = true;

      if (lastInbound?.sent_at) {
        const lastInboundTime = new Date(lastInbound.sent_at).getTime();
        if (!isNaN(lastInboundTime) && lastInboundTime > 0) {
          elapsedHoursSinceInbound = (Date.now() - lastInboundTime) / (1000 * 60 * 60);
          isOutside24hWindow = elapsedHoursSinceInbound >= 24;
        }
      }

      const followUpMsg = await generateContextualFollowUp(lead, ordered);

      if (lead.source === 'whatsapp' && lead.contact) {
        if (isOutside24hWindow) {
          // Outside the 24-hour window: Meta strictly forbids free-form session messages.
          // Flag as requiring pre-approved Meta HSM template to protect WABA account.
          const cronSettings = await getStudioSettings();
          const templateName = cronSettings.whatsappFollowupTemplateName;
          console.log(`[Follow-Up Cron] Lead ${lead.id} is outside 24h window (${elapsedHoursSinceInbound >= 900 ? 'no inbound message recorded' : `${elapsedHoursSinceInbound.toFixed(1)}h elapsed`}). Flagged as requiring Meta HSM template: "${templateName}"`);

          const templateRes = await sendWhatsAppTemplate(lead.contact, templateName);
          if (templateRes.success) {
            await supabaseAdmin.from('messages').insert({
              lead_id: lead.id,
              direction: 'outbound',
              content: `[Meta HSM Template: ${templateName}] Automated re-engagement template dispatched (Outside 24h window). Draft context: "${followUpMsg}"`,
              channel: 'whatsapp',
            });
            await supabaseAdmin
              .from('leads')
              .update({
                status: 'contacted',
                last_contacted_at: new Date().toISOString(),
              })
              .eq('id', lead.id);
            followUpCount++;
          } else {
            console.warn(`[Follow-Up Cron] Meta HSM template "${templateName}" unavailable or rejected (${templateRes.error}). Flagged without free-form send to protect WABA account.`);
            await supabaseAdmin.from('messages').insert({
              lead_id: lead.id,
              direction: 'outbound',
              content: `[Meta 24h Window Notice] Message withheld to prevent Meta WABA restrictions. Requires pre-approved HSM template ("${templateName}"). Prepared draft: "${followUpMsg}"`,
              channel: 'whatsapp',
            });
            await supabaseAdmin
              .from('leads')
              .update({
                last_contacted_at: new Date().toISOString(),
              })
              .eq('id', lead.id);
          }
          continue;
        } else {
          // Within 24-hour customer service window: free-form automated reply is compliant
          await sendWhatsAppMessage(lead.contact, followUpMsg);
        }
      }

      await supabaseAdmin.from('messages').insert({
        lead_id: lead.id,
        direction: 'outbound',
        content: followUpMsg,
        channel: lead.source || 'whatsapp',
      });

      await supabaseAdmin
        .from('leads')
        .update({
          status: 'contacted',
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      followUpCount++;
    }

    // Send digest to Telegram
    if (followUpCount > 0) {
      await sendTelegramFollowUpDigest(followUpCount, `Re-engaged ${followUpCount} inactive leads with personalized AI follow-ups.`);
    }

    return NextResponse.json({ success: true, processedCount: followUpCount });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Manual 1-click follow-up trigger from dashboard
export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const { data: pastMsgs } = await supabaseAdmin
      .from('messages')
      .select('direction, content, sent_at')
      .eq('lead_id', lead.id)
      .order('sent_at', { ascending: false })
      .limit(10);

    const ordered = pastMsgs ? [...pastMsgs].reverse() : [];

    // Meta 24-Hour Messaging Window Compliance Check:
    const lastInbound = ordered.slice().reverse().find((m) => m.direction === 'inbound');
    let elapsedHours = 999;
    let isOutside24hWindow = true;

    if (lastInbound?.sent_at) {
      const lastInboundTime = new Date(lastInbound.sent_at).getTime();
      if (!isNaN(lastInboundTime) && lastInboundTime > 0) {
        elapsedHours = (Date.now() - lastInboundTime) / (1000 * 60 * 60);
        isOutside24hWindow = elapsedHours >= 24;
      }
    }

    const followUpMsg = await generateContextualFollowUp(lead, ordered);

    if (lead.source === 'whatsapp' && lead.contact) {
      if (isOutside24hWindow) {
        const postSettings = await getStudioSettings();
        const templateName = postSettings.whatsappFollowupTemplateName;
        const templateRes = await sendWhatsAppTemplate(lead.contact, templateName);
        if (!templateRes.success) {
          return NextResponse.json({
            error: `Outside 24-hour Meta messaging window (${elapsedHours >= 900 ? 'no inbound message recorded' : `${elapsedHours.toFixed(1)}h elapsed`}). Pre-approved Meta HSM template ('${templateName}') required. Template status: ${templateRes.error}`,
            outside24hWindow: true,
            requiresHsmTemplate: true,
            suggestedDraft: followUpMsg,
          }, { status: 422 });
        }

        // Successfully sent pre-approved HSM template
        await supabaseAdmin.from('messages').insert({
          lead_id: lead.id,
          direction: 'outbound',
          content: `[Meta HSM Template: ${templateName}] Re-engagement template dispatched (Outside 24h window). Draft context: "${followUpMsg}"`,
          channel: 'whatsapp',
        });

        await supabaseAdmin
          .from('leads')
          .update({
            status: 'contacted',
            last_contacted_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        return NextResponse.json({ 
          success: true, 
          templateSent: templateName,
          followUpMessage: `[Meta HSM Template: ${templateName}] Re-engagement template dispatched.`,
          outside24hWindow: true,
        });
      } else {
        const sendRes = await sendWhatsAppMessage(lead.contact, followUpMsg);
        if (!sendRes.success) {
          return NextResponse.json({ error: sendRes.error || 'Failed to dispatch WhatsApp message' }, { status: 500 });
        }
      }
    }

    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id,
      direction: 'outbound',
      content: followUpMsg,
      channel: lead.source || 'whatsapp',
    });

    await supabaseAdmin
      .from('leads')
      .update({
        status: 'contacted',
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    return NextResponse.json({ 
      success: true, 
      followUpMessage: followUpMsg,
      outside24hWindow: false,
    });
  } catch (err: any) {
    console.error('Manual follow-up error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
