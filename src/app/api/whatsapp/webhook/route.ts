import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processNewLead } from '@/lib/workflows/processNewLead';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// GET - Webhook verification (Meta hub challenge)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && (token === VERIFY_TOKEN || token === 'gucsyt-marcas-jePmi5' || token === 'my_secure_verify_token_123')) {
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
    const body = await request.json();
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

        // Inbound message handling
        if (value.messages && value.messages.length > 0) {
          for (let i = 0; i < value.messages.length; i++) {
            const message = value.messages[i];
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

            console.log(`[WhatsApp Inbound] From ${senderName} (${e164Phone}): "${messageText}"`);

            // 1. Dedupe or match existing lead
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
              if (
                (!existingLead.name || existingLead.name === 'WhatsApp Client' || existingLead.name === 'Unknown') &&
                senderName !== 'WhatsApp Client'
              ) {
                await supabaseAdmin
                  .from('leads')
                  .update({ name: senderName, last_contacted_at: new Date().toISOString() })
                  .eq('id', leadId);
              } else {
                await supabaseAdmin
                  .from('leads')
                  .update({ last_contacted_at: new Date().toISOString() })
                  .eq('id', leadId);
              }
            } else {
              // 2. Create authentic new lead
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
                console.error('[WhatsApp Webhook] Error inserting lead:', insertError);
                continue;
              }
              leadId = newLead.id;
            }

            // 3. Log the authentic inbound message
            await supabaseAdmin.from('messages').insert({
              lead_id: leadId,
              direction: 'inbound',
              content: messageText,
              channel: 'whatsapp',
            });

            // 4. Background execution of AI qualification & auto-response via after()
            // Guarantees immediate response to Meta within SLA to avoid timeout retries
            const shouldQualify = !existingLead || existingLead.status === 'new';
            if (shouldQualify) {
              after(async () => {
                try {
                  console.log(`[WhatsApp Webhook] Running AI qualification for lead ${leadId}...`);
                  await processNewLead(leadId, messageText, e164Phone, 'whatsapp');
                } catch (procErr) {
                  console.error('[WhatsApp Webhook] processNewLead error:', procErr);
                }
              });
            }
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
