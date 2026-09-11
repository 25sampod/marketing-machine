import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processNewLead } from '@/lib/workflows/processNewLead';
import { verifyHmacSignature, isDuplicateMessageId } from '@/lib/whatsapp/webhook';
import { getStudioSettings } from '@/lib/settings';
import { sendWhatsAppTypingIndicator } from '@/lib/whatsapp/api';

// GET - Webhook verification (Meta hub challenge)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const settings = await getStudioSettings();
    const validTokens = [
      settings.whatsappVerifyToken,
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      'gucsyt-marcas-jePmi5',
    ].filter(Boolean) as string[];

    if (mode === 'subscribe' && token && validTokens.includes(token)) {
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  } catch (err: any) {
    console.error('[WhatsApp Webhook] GET Verification error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - Inbound WhatsApp Webhook Handler (wacrm pattern)
export async function POST(request: Request) {
  try {
    const rawBuffer = Buffer.from(await request.arrayBuffer());
    const rawBody = rawBuffer.toString('utf-8');

    // 1. Webhook HMAC Signature Verification if metaAppSecret is configured in studio_settings or env
    const settings = await getStudioSettings();
    const appSecret = settings.metaAppSecret;
    if (appSecret) {
      const signatureHeader = request.headers.get('x-hub-signature-256');
      const isValid = verifyHmacSignature(rawBuffer, signatureHeader, appSecret);
      if (!isValid) {
        console.warn('[WhatsApp Webhook] Rejected payload: invalid x-hub-signature-256 HMAC signature.');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[WhatsApp Webhook] Invalid JSON payload:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('[WhatsApp Webhook] Inbound Payload:', JSON.stringify(body));

    const entries = body.entry || (Array.isArray(body) ? body : []);
    if (!entries.length && body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    // Process messages
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value) continue;

        // Inbound customer typing/presence handling (from companion / gateway / forwarder)
        const typingEvent = value.typing || value.presence || (value.event === 'typing' ? value : null);
        if (typingEvent) {
          const rawPhone = typingEvent.from || typingEvent.sender || typingEvent.contact;
          if (rawPhone) {
            const cleanPhone = String(rawPhone).replace(/[^\d]/g, '');
            const e164Phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
            const isTyping = typingEvent.status !== 'paused' && typingEvent.status !== 'stopped' && typingEvent.typing !== false;

            const { data: matchedLead } = await supabaseAdmin
              .from('leads')
              .select('id')
              .or(`contact.eq.${rawPhone},contact.eq.${cleanPhone},contact.eq.${e164Phone}`)
              .limit(1)
              .maybeSingle();

            if (matchedLead?.id) {
              const channel = supabaseAdmin.channel(`chat:${matchedLead.id}`);
              await channel.send({
                type: 'broadcast',
                event: 'customer_typing',
                payload: { leadId: matchedLead.id, isTyping, timestamp: Date.now() },
              });
              await supabaseAdmin.removeChannel(channel);
            }
          }
        }

        // Inbound message handling
        if (value.messages && value.messages.length > 0) {
          for (let i = 0; i < value.messages.length; i++) {
            const message = value.messages[i];
            const messageId = message.id;

            // Deduplicate on message_id (prevent duplicate processing from Meta webhook retries)
            if (messageId) {
              if (isDuplicateMessageId(messageId)) {
                console.log(`[WhatsApp Webhook] Duplicate message_id detected (in-memory): ${messageId}. Skipping.`);
                continue;
              }

              try {
                const { data: existingMsg } = await supabaseAdmin
                  .from('messages')
                  .select('id')
                  .eq('whatsapp_message_id', messageId)
                  .limit(1)
                  .maybeSingle();

                if (existingMsg) {
                  console.log(`[WhatsApp Webhook] Duplicate message_id detected (database): ${messageId}. Skipping.`);
                  continue;
                }
              } catch (dbErr) {
                // Graceful fallback if database column is not yet present
              }
            }

            const contact = (value.contacts && value.contacts[i]) || value.contacts?.[0];

            const rawPhone = message.from;
            const cleanPhone = String(rawPhone).replace(/[^\d]/g, '');
            const e164Phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
            const senderName = contact?.profile?.name || 'WhatsApp Client';

            const messageText =
              message.text?.body ||
              message.interactive?.button_reply?.title ||
              message.interactive?.list_reply?.title ||
              message.button?.text ||
              (message.type ? `[${message.type} message]` : '');

            console.log(`[WhatsApp Inbound] From ${senderName} (${e164Phone}) [msgId: ${messageId || 'none'}]: "${messageText}"`);

            const referral = message.referral;
            const campaignName = referral?.headline || (referral?.source_id ? `Meta Ad (${referral.source_id})` : 'Direct WhatsApp');
            const adId = referral?.source_id || null;
            const utmSource = referral?.source_type ? `meta_${referral.source_type}` : 'whatsapp';

            // 1. Dedupe or match existing lead
            const { data: existingLeads } = await supabaseAdmin
              .from('leads')
              .select('id, status, name, campaign')
              .or(`contact.eq.${rawPhone},contact.eq.${cleanPhone},contact.eq.${e164Phone}`)
              .order('created_at', { ascending: false })
              .limit(1);

            let leadId: string;
            const existingLead = existingLeads?.[0];

            if (existingLead) {
              leadId = existingLead.id;
              const updates: Record<string, any> = { last_contacted_at: new Date().toISOString() };
              if (
                (!existingLead.name || existingLead.name === 'WhatsApp Client' || existingLead.name === 'Unknown') &&
                senderName !== 'WhatsApp Client'
              ) {
                updates.name = senderName;
              }
              if (referral && (!existingLead.campaign || existingLead.campaign === 'Direct WhatsApp')) {
                updates.campaign = campaignName;
                updates.ad_id = adId;
                updates.utm_source = utmSource;
              }
              await supabaseAdmin.from('leads').update(updates).eq('id', leadId);
            } else {
              // 2. Create authentic new lead with campaign attribution
              const { data: newLead, error: insertError } = await supabaseAdmin
                .from('leads')
                .insert({
                  name: senderName,
                  contact: e164Phone,
                  source: 'whatsapp',
                  message: messageText,
                  status: 'new',
                  campaign: campaignName,
                  ad_id: adId,
                  utm_source: utmSource,
                })
                .select('id')
                .single();

              if (insertError || !newLead) {
                console.error('[WhatsApp Webhook] Error inserting lead:', insertError);
                continue;
              }
              leadId = newLead.id;
            }

            // 3. Log the authentic inbound message with message_id for deduplication
            const msgInsertPayload: Record<string, any> = {
              lead_id: leadId,
              direction: 'inbound',
              content: messageText,
              channel: 'whatsapp',
            };
            if (messageId) {
              msgInsertPayload.whatsapp_message_id = messageId;
            }

            const { error: msgInsertErr } = await supabaseAdmin.from('messages').insert(msgInsertPayload);
            if (msgInsertErr && msgInsertErr.message?.includes('whatsapp_message_id')) {
              delete msgInsertPayload.whatsapp_message_id;
              await supabaseAdmin.from('messages').insert(msgInsertPayload);
            }

            // 4. Background execution of AI qualification & autonomous response via after()
            // Guarantees immediate 200 response to Meta within SLA to avoid timeout retries
            after(async () => {
              try {
                // Immediately show native "typing..." status to client on WhatsApp while AI prepares response
                if (messageId) {
                  await sendWhatsAppTypingIndicator(messageId);
                }
                console.log(`[WhatsApp Webhook] Running AI conversational processor for lead ${leadId}...`);
                await processNewLead(leadId, messageText, e164Phone, 'whatsapp');
              } catch (procErr) {
                console.error('[WhatsApp Webhook] processNewLead error:', procErr);
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
