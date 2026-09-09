import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processNewLead } from '@/lib/workflows/processNewLead';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Webhook Verification (Meta requires this when setting up the webhook)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'gucsyt-marcas-jePmi5' || token === 'my_secure_verify_token_123')) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse('Bad Request', { status: 400 });
}

// Handling Incoming Messages
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[WhatsApp Webhook] Inbound Payload:', JSON.stringify(body));

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages && change.value.messages[0]) {
            const message = change.value.messages[0];
            const contact = change.value.contacts?.[0];
            const rawPhone = message.from; // Phone number from WhatsApp (digits)
            const cleanPhone = String(rawPhone).replace(/[^\d]/g, '');
            const e164Phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
            
            const senderName = contact?.profile?.name || 'WhatsApp Client';
            const messageText = 
              message.text?.body || 
              message.interactive?.button_reply?.title || 
              message.interactive?.list_reply?.title || 
              message.button?.text || 
              (message.type ? `[${message.type} message]` : '');

            console.log(`[WhatsApp Lead] Incoming from ${senderName} (${e164Phone}): "${messageText}"`);

            // 1. Check if lead already exists based on any format of this phone number
            const { data: existingLeads } = await supabaseAdmin
              .from('leads')
              .select('id, status, name')
              .or(`contact.eq.${rawPhone},contact.eq.${cleanPhone},contact.eq.${e164Phone}`)
              .order('created_at', { ascending: false })
              .limit(1);

            let leadId: string;
            const existingLead = existingLeads?.[0];

            if (existingLead) {
              leadId = existingLead.id;
              // Update name if real profile name is now available and previous was placeholder
              if ((!existingLead.name || existingLead.name === 'WhatsApp Client' || existingLead.name === 'Unknown') && senderName !== 'WhatsApp Client') {
                await supabaseAdmin
                  .from('leads')
                  .update({ name: senderName, last_contacted_at: new Date().toISOString() })
                  .eq('id', leadId);
              }
            } else {
              // 2. Create new lead with normalized phone and sender name
              const { data: newLead, error: insertError } = await supabaseAdmin
                .from('leads')
                .insert({
                  name: senderName,
                  contact: e164Phone,
                  source: 'whatsapp',
                  message: messageText,
                  status: 'new',
                })
                .select('id')
                .single();

              if (insertError || !newLead) {
                console.error('[WhatsApp Webhook] Error creating lead:', insertError);
                continue;
              }
              leadId = newLead.id;
              console.log(`[WhatsApp Webhook] Created new lead ${leadId} for ${e164Phone}`);
            }

            // 3. Log the inbound message to messages table
            await supabaseAdmin
              .from('messages')
              .insert({
                lead_id: leadId,
                direction: 'inbound',
                content: messageText,
                channel: 'whatsapp',
              });

            // 4. If lead is new or still pending qualification, process AI workflow
            if (!existingLead || existingLead.status === 'new') {
              console.log(`[WhatsApp Webhook] Triggering AI qualification for lead ${leadId}...`);
              processNewLead(leadId, messageText, e164Phone, 'whatsapp');
            } else {
              // If already qualified, simply update last_contacted_at timestamp
              await supabaseAdmin
                .from('leads')
                .update({ last_contacted_at: new Date().toISOString() })
                .eq('id', leadId);
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Inbound Processing Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
