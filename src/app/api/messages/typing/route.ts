import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, phone, isTyping = true } = body;

    let targetLeadId = leadId;

    if (!targetLeadId && phone) {
      const cleanPhone = String(phone).replace(/[^\d]/g, '');
      const e164Phone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .or(`contact.eq.${phone},contact.eq.${cleanPhone},contact.eq.${e164Phone}`)
        .limit(1)
        .maybeSingle();

      targetLeadId = lead?.id;
    }

    if (!targetLeadId) {
      return NextResponse.json(
        { error: 'Lead not found or missing leadId / phone parameter' },
        { status: 404 }
      );
    }

    // Broadcast customer_typing via Supabase Realtime channel
    const channel = supabaseAdmin.channel(`chat:${targetLeadId}`);
    await channel.send({
      type: 'broadcast',
      event: 'customer_typing',
      payload: {
        leadId: targetLeadId,
        isTyping: Boolean(isTyping),
        timestamp: Date.now(),
      },
    });
    await supabaseAdmin.removeChannel(channel);

    return NextResponse.json({
      success: true,
      leadId: targetLeadId,
      isTyping: Boolean(isTyping),
    });
  } catch (error: any) {
    console.error('[Typing API Error]:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
