import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp/api';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Determine the threshold for follow-up (e.g., 48 hours in production, maybe 2 mins for testing if a test env var is set)
    // For MVP, we'll just use a generic 'stale' concept, say 2 minutes for testing demo.
    const TEST_MODE = true; 
    const minutesThreshold = TEST_MODE ? 2 : 48 * 60; 
    const thresholdDate = new Date(Date.now() - minutesThreshold * 60 * 1000).toISOString();

    const { data: staleLeads, error } = await supabaseAdmin
      .from('leads')
      .select('id, contact, source')
      .eq('status', 'contacted') // wait, our workflow set it to 'new' or 'qualified'. 
      // If we auto-replied, status is still 'new' or 'qualified'. Let's say if they are 'qualified' but haven't replied.
      .in('status', ['new', 'qualified'])
      .lt('last_contacted_at', thresholdDate);

    if (error) {
      console.error('Error fetching stale leads:', error);
      return new Response('Database Error', { status: 500 });
    }

    if (!staleLeads || staleLeads.length === 0) {
      return NextResponse.json({ success: true, message: 'No stale leads found.' });
    }

    let followUpCount = 0;

    for (const lead of staleLeads) {
      const followUpMsg = "Hi again! Just checking if you had any further thoughts on your project?";
      
      if (lead.source === 'whatsapp') {
        await sendWhatsAppMessage(lead.contact, followUpMsg);
      }

      await supabaseAdmin
        .from('messages')
        .insert({
          lead_id: lead.id,
          direction: 'outbound',
          content: followUpMsg,
          channel: lead.source,
        });

      await supabaseAdmin
        .from('leads')
        .update({ 
          status: 'contacted', // bump status so we don't spam them
          last_contacted_at: new Date().toISOString() 
        })
        .eq('id', lead.id);
        
      followUpCount++;
    }

    return NextResponse.json({ success: true, followUpCount });
  } catch (error) {
    console.error('Cron Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
