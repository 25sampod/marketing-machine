import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processNewLead } from '@/lib/workflows/processNewLead';

export async function POST(request: Request) {
  try {
    const { name, contact, message, source = 'web' } = await request.json();

    if (!name || !contact) {
      return NextResponse.json({ error: 'Name and contact required' }, { status: 400 });
    }

    // Clean and normalize contact if phone number
    const isEmail = contact.includes('@');
    let normalizedContact = contact.trim();
    if (!isEmail) {
      const cleanDigits = normalizedContact.replace(/[^\d]/g, '');
      normalizedContact = cleanDigits.startsWith('+') ? cleanDigits : `+${cleanDigits}`;
    }

    // Check if lead already exists
    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('id, status, name')
      .eq('contact', normalizedContact)
      .limit(1);

    let leadId: string;

    if (existingLeads && existingLeads.length > 0) {
      leadId = existingLeads[0].id;
      await supabaseAdmin
        .from('leads')
        .update({
          name: name || existingLeads[0].name,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', leadId);
    } else {
      // Insert new lead
      const { data: newLead, error } = await supabaseAdmin
        .from('leads')
        .insert({
          name,
          contact: normalizedContact,
          source,
          message,
          status: 'new',
        })
        .select('id')
        .single();

      if (error || !newLead) {
        throw error;
      }
      leadId = newLead.id;
    }

    // Log the inbound message
    await supabaseAdmin
      .from('messages')
      .insert({
        lead_id: leadId,
        direction: 'inbound',
        content: message || '(Inquiry captured)',
        channel: source,
      });

    // Fire & forget qualification workflow
    processNewLead(leadId, message || '', normalizedContact, source);

    return NextResponse.json({ success: true, leadId }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
