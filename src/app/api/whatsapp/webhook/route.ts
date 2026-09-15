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
      settings.instagramVerifyToken,
      settings.messengerVerifyToken,
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      process.env.INSTAGRAM_VERIFY_TOKEN,
      process.env.MESSENGER_VERIFY_TOKEN,
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
    if (!entries.length && !['whatsapp_business_account', 'instagram', 'page'].includes(body.object)) {
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

            // Handle customer-initiated edit (Meta WhatsApp webhook type: "edit")
            if (message.type === 'edit' && message.edit?.original_message_id) {
              const origWamid = message.edit.original_message_id;
              const newBody = message.edit.message?.text?.body || message.text?.body || '';
              if (newBody) {
                console.log(`[WhatsApp Inbound Edit] Customer edited message ${origWamid} -> "${newBody}"`);
                const { data: updatedMsg } = await supabaseAdmin
                  .from('messages')
                  .update({ content: newBody, is_edited: true, updated_at: new Date().toISOString() })
                  .eq('whatsapp_message_id', origWamid)
                  .select('id, lead_id')
                  .maybeSingle();

                if (updatedMsg?.lead_id) {
                  const { data: latestMsg } = await supabaseAdmin
                    .from('messages')
                    .select('id')
                    .eq('lead_id', updatedMsg.lead_id)
                    .order('sent_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (latestMsg?.id === updatedMsg.id) {
                    await supabaseAdmin.from('leads').update({ message: newBody }).eq('id', updatedMsg.lead_id);
                  }

                  const channel = supabaseAdmin.channel(`chat:${updatedMsg.lead_id}`);
                  await channel.send({
                    type: 'broadcast',
                    event: 'customer_edit',
                    payload: { messageId: updatedMsg.id, originalMessageId: origWamid, content: newBody, isEdited: true },
                  });
                  await supabaseAdmin.removeChannel(channel);
                }
              }
              continue;
            }

            // Handle customer-initiated revoke/delete (Meta WhatsApp webhook type: "revoke")
            if (message.type === 'revoke' && message.revoke?.original_message_id) {
              const origWamid = message.revoke.original_message_id;
              console.log(`[WhatsApp Inbound Revoke] Customer deleted message ${origWamid}`);
              const { data: revokedMsg } = await supabaseAdmin
                .from('messages')
                .select('id, lead_id')
                .eq('whatsapp_message_id', origWamid)
                .maybeSingle();

              if (revokedMsg) {
                await supabaseAdmin.from('messages').delete().eq('id', revokedMsg.id);
                const channel = supabaseAdmin.channel(`chat:${revokedMsg.lead_id}`);
                await channel.send({
                  type: 'broadcast',
                  event: 'message_deleted',
                  payload: { messageId: revokedMsg.id },
                });
                await supabaseAdmin.removeChannel(channel);
              }
              continue;
            }

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
                // Broadcast AI typing status immediately to the dashboard in real-time
                const typingChannel = supabaseAdmin.channel(`chat:${leadId}`);
                await typingChannel.send({
                  type: 'broadcast',
                  event: 'ai_typing',
                  payload: { leadId, isTyping: true, timestamp: Date.now() },
                });
                await supabaseAdmin.removeChannel(typingChannel);

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

      // Process Meta Messenger and Instagram Direct messaging items
      if (entry.messaging && Array.isArray(entry.messaging)) {
        const isInstagram = body.object === 'instagram';
        const channelSource = isInstagram ? 'instagram' : 'messenger';

        for (const item of entry.messaging) {
          // Ignore echo messages sent by the page/account itself
          if (item.message?.is_echo) continue;

          const senderId = item.sender?.id;
          const messageText = item.message?.text;
          const messageId = item.message?.mid;

          if (!senderId || !messageText) continue;

          // Message deduplication
          if (messageId && isDuplicateMessageId(messageId)) {
            console.log(`[Meta ${channelSource}] Skipping duplicate message ID: ${messageId}`);
            continue;
          }

          // 1. Match or create authentic lead
          const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id, name')
            .eq('contact', senderId)
            .eq('source', channelSource)
            .maybeSingle();

          let leadId: string;
          if (existingLead) {
            leadId = existingLead.id;
            await supabaseAdmin.from('leads').update({
              last_inbound_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', leadId);
          } else {
            const defaultName = isInstagram
              ? `Instagram Lead (${senderId.slice(-4)})`
              : `Messenger Lead (${senderId.slice(-4)})`;

            const { data: newLead, error: insertError } = await supabaseAdmin
              .from('leads')
              .insert({
                name: defaultName,
                contact: senderId,
                source: channelSource,
                channel: channelSource,
                message: messageText,
                status: 'new',
                priority_tier: 'standard',
                last_inbound_message_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (insertError || !newLead) {
              console.error(`[Meta ${channelSource}] Error inserting lead:`, insertError);
              continue;
            }
            leadId = newLead.id;
          }

          // 2. Log inbound message
          const msgPayload: Record<string, any> = {
            lead_id: leadId,
            direction: 'inbound',
            content: messageText,
            channel: channelSource,
          };
          if (messageId) {
            msgPayload.whatsapp_message_id = messageId;
          }
          await supabaseAdmin.from('messages').insert(msgPayload);

          // 3. Background AI qualification & response via after()
          after(async () => {
            try {
              const typingChannel = supabaseAdmin.channel(`chat:${leadId}`);
              await typingChannel.send({
                type: 'broadcast',
                event: 'ai_typing',
                payload: { leadId, isTyping: true, timestamp: Date.now() },
              });
              await supabaseAdmin.removeChannel(typingChannel);

              console.log(`[Meta ${channelSource}] Running AI conversational processor for lead ${leadId}...`);
              await processNewLead(leadId, messageText, senderId, channelSource);
            } catch (procErr) {
              console.error(`[Meta ${channelSource}] processNewLead error:`, procErr);
            }
          });
        }
      }
    }

    return NextResponse.json({ status: 'received' }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Handler Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
