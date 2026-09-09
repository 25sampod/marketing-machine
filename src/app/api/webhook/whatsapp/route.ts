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
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
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

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages && change.value.messages[0]) {
            const message = change.value.messages[0];
            const contact = change.value.contacts?.[0];
            const senderPhone = message.from; // Phone number
            const senderName = contact?.profile?.name || 'Unknown';
            const messageText = message.text?.body || '';
            const messageId = message.id;

            // 1. Check if lead already exists based on contact (phone)
            const { data: existingLeads } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('contact', senderPhone)
              .limit(1);

            let leadId;

            if (existingLeads && existingLeads.length > 0) {
              leadId = existingLeads[0].id;
            } else {
              // 2. Create new lead if doesn't exist
              const { data: newLead, error: insertError } = await supabaseAdmin
                .from('leads')
                .insert({
                  name: senderName,
                  contact: senderPhone,
                  source: 'whatsapp',
                  message: messageText,
                })
                .select('id')
                .single();

              if (insertError || !newLead) {
                console.error('Error creating lead:', insertError);
                continue;
              }
              leadId = newLead.id;
            }

            // 3. Log the inbound message
            await supabaseAdmin
              .from('messages')
              .insert({
                lead_id: leadId,
                direction: 'inbound',
                content: messageText,
                channel: 'whatsapp',
              });

            // 4. If new lead, process workflow (qualification & routing)
            if (!existingLeads || existingLeads.length === 0) {
              // Fire & forget
              processNewLead(leadId, messageText, senderPhone, 'whatsapp');
            } else {
              // If it's an existing lead, we might just update the last_contacted_at
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
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
