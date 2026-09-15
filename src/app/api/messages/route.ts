import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp/api';
import { sendMetaDirectMessage } from '@/lib/meta/messaging';
import { checkMessageEditEligibility } from '@/lib/messages/messageActions';

// GET: Check edit eligibility or inspect a message
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const checkEdit = searchParams.get('checkEdit');

    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle();

    if (error || !message) {
      return NextResponse.json({ canEdit: false, error: 'Message not found' }, { status: 404 });
    }

    if (checkEdit === 'true') {
      const eligibility = checkMessageEditEligibility(message);
      return NextResponse.json({
        canEdit: eligibility.canEdit,
        reason: eligibility.reason,
        remainingMinutes: eligibility.remainingMinutes,
        message: {
          id: message.id,
          content: message.content,
          direction: message.direction,
          sent_at: message.sent_at,
          is_edited: message.is_edited,
        },
      });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

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

    let sentWaMessageId: string | null = null;
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
      sentWaMessageId = waResult.messageId || null;
    } else if (lead.source === 'instagram' || lead.source === 'messenger') {
      const metaResult = await sendMetaDirectMessage(lead.contact, text, {
        channel: lead.source as 'instagram' | 'messenger',
      });
      if (!metaResult.success) {
        console.error(`Failed to deliver ${lead.source} message:`, metaResult.error);
        return NextResponse.json(
          {
            error: `${lead.source === 'instagram' ? 'Instagram' : 'Messenger'} Delivery Failed: ${metaResult.error || 'Meta rejected the message'}`,
          },
          { status: 502 }
        );
      }
      sentWaMessageId = metaResult.messageId || null;
    }

    await supabaseAdmin.from('messages').insert({
      lead_id: leadId,
      direction: 'outbound',
      content: text,
      channel: lead.source,
      whatsapp_message_id: sentWaMessageId,
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

// PATCH: Edit an existing message
export async function PATCH(request: Request) {
  try {
    const { messageId, content, leadId } = await request.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing messageId or content parameter' }, { status: 400 });
    }

    // 1. Fetch existing message
    const { data: existingMsg, error: fetchErr } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle();

    if (fetchErr || !existingMsg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // 2. Validate edit eligibility
    const eligibility = checkMessageEditEligibility(existingMsg);
    if (!eligibility.canEdit) {
      return NextResponse.json(
        { error: eligibility.reason || 'This message cannot be edited.' },
        { status: 403 }
      );
    }

    // 3. Update message content and flag as edited
    const updatedContent = content.trim();
    const updatePayload: Record<string, any> = {
      content: updatedContent,
      is_edited: true,
      updated_at: new Date().toISOString(),
    };

    let { data: updatedMsg, error: updateErr } = await supabaseAdmin
      .from('messages')
      .update(updatePayload)
      .eq('id', messageId)
      .select()
      .single();

    if (updateErr && updateErr.message?.includes('updated_at')) {
      delete updatePayload.updated_at;
      const retry = await supabaseAdmin
        .from('messages')
        .update(updatePayload)
        .eq('id', messageId)
        .select()
        .single();
      updatedMsg = retry.data;
      updateErr = retry.error;
    }

    if (updateErr) {
      console.error('Failed to update message:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Update lead's message snippet if this was the latest message
    const targetLeadId = leadId || existingMsg.lead_id;
    if (targetLeadId) {
      const { data: latestMsg } = await supabaseAdmin
        .from('messages')
        .select('id, content')
        .eq('lead_id', targetLeadId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestMsg?.id === messageId) {
        await supabaseAdmin
          .from('leads')
          .update({ message: updatedContent })
          .eq('id', targetLeadId);
      }
    }

    return NextResponse.json({
      success: true,
      message: updatedMsg,
    });
  } catch (error: any) {
    console.error('PATCH Message Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Delete an individual message (messageId) or clear all messages for a lead (leadId)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const messageId = searchParams.get('messageId');

    if (!leadId && !messageId) {
      return NextResponse.json({ error: 'Missing leadId or messageId parameter' }, { status: 400 });
    }

    // Case 1: Delete a single message
    if (messageId) {
      const { error: deleteErr } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (deleteErr) {
        console.error('Error deleting single message:', deleteErr);
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }

      // If leadId was provided, update the lead's snippet to the latest remaining message
      if (leadId) {
        const { data: latestMsg } = await supabaseAdmin
          .from('messages')
          .select('content')
          .eq('lead_id', leadId)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabaseAdmin
          .from('leads')
          .update({ message: latestMsg?.content || null })
          .eq('id', leadId);
      }

      return NextResponse.json({ success: true, deletedMessageId: messageId });
    }

    // Case 2: Clear all messages for a specific lead
    if (leadId) {
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
          score: 0,
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

      return NextResponse.json({ success: true, clearedLeadId: leadId });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
