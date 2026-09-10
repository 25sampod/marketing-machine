import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp/api';

export async function POST(request: Request) {
  try {
    const { leadId, text } = await request.json();

    if (!leadId || !text) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('contact, source')
      .eq('id', leadId)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.source === 'whatsapp') {
      const waResult = await sendWhatsAppMessage(lead.contact, text);
      if (!waResult.success) {
        console.error('Failed to deliver WhatsApp message:', waResult.error);
        return NextResponse.json(
          {
            error: `WhatsApp Delivery Failed: ${waResult.error || 'Meta rejected the message'}`,
          },
          { status: 502 }
        );
      }
    }

    await supabaseAdmin.from('messages').insert({
      lead_id: leadId,
      direction: 'outbound',
      content: text,
      channel: lead.source,
    });

    await supabaseAdmin
      .from('leads')
      .update({ last_contacted_at: new Date().toISOString() })
      .eq('id', leadId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Archive / Clear messages for a specific lead while preserving cumulative lead profile
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json({ error: 'Missing leadId parameter' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('lead_id', leadId);

    if (error) {
      console.error('Error clearing messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear message history and reset stale discovery / qualification fields
    // so no ghost information remains after conversation deletion
    await supabaseAdmin
      .from('leads')
      .update({
        message: null,
        suggested_reply: null,
        qualification_percentage: 0,
        priority_tier: 'medium',
        discovery_stage: 'discovery',
        project_type: null,
        estimated_budget: null,
        timeline: null,
        ai_summary: null,
        budget_mentioned: false,
        status: 'new',
      })
      .eq('id', leadId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
