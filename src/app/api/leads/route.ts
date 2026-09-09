import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processNewLead } from '@/lib/workflows/processNewLead';

export async function POST(request: Request) {
  try {
    const { name, contact, message, source = 'web' } = await request.json();

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact required' }, { status: 400 });
    }

    // Insert new lead
    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        name,
        contact,
        source,
        message,
      })
      .select('id')
      .single();

    if (error || !newLead) {
      throw error;
    }

    // Log the initial message
    await supabaseAdmin
      .from('messages')
      .insert({
        lead_id: newLead.id,
        direction: 'inbound',
        content: message || '(No message provided)',
        channel: source,
      });

    // Fire & forget workflow
    processNewLead(newLead.id, message || '', contact, source);

    return NextResponse.json({ success: true, leadId: newLead.id }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
