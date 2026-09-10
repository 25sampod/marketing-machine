import { supabaseAdmin } from '../supabase';
import { qualifyLeadMessage, HistoricalContext } from '../ai/qualifyLead';
import { sendWhatsAppMessage } from '../whatsapp/api';
import { sendLeadQualifiedNotification } from '../email/resend';

export async function processNewLead(
  leadId: string,
  messageText: string,
  contact: string,
  source: string
) {
  try {
    // 1. Fetch current lead data and historical conversation context
    const { data: leadRecord } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    const { data: pastMessages } = await supabaseAdmin
      .from('messages')
      .select('direction, content')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
      .limit(8);

    const history: HistoricalContext = {
      previousProjectType: leadRecord?.project_type,
      previousBudget: leadRecord?.estimated_budget,
      previousPercentage: leadRecord?.qualification_percentage,
      previousSummary: leadRecord?.ai_summary,
      recentMessages: pastMessages || [],
    };

    // 2. Qualify via Azure OpenAI with cumulative intelligence
    const qualification = await qualifyLeadMessage(messageText, history);

    const percentage = qualification.qualification_percentage;
    const isQualified = percentage >= 60;
    const status = isQualified ? 'qualified' : 'new';
    const score = percentage >= 70 ? 2 : percentage >= 40 ? 1 : 0;

    let assignedTo = leadRecord?.assigned_to || null;

    // 3. Specialty routing if not already assigned
    if (isQualified && !assignedTo && qualification.project_type) {
      const { data: teamMembers } = await supabaseAdmin
        .from('team_members')
        .select('id, specialty, role');

      if (teamMembers && teamMembers.length > 0) {
        const match = teamMembers.find(
          (m) => m.specialty?.toLowerCase() === qualification.project_type?.toLowerCase()
        );
        assignedTo = match ? match.id : teamMembers[0].id;
      }
    }

    // 4. Persist updated lead intelligence
    await supabaseAdmin
      .from('leads')
      .update({
        budget_mentioned: qualification.budget_mentioned,
        project_type: qualification.project_type,
        score,
        qualification_percentage: percentage,
        priority_tier: qualification.priority_tier,
        ai_summary: qualification.key_insights,
        estimated_budget: qualification.estimated_budget,
        timeline: qualification.timeline,
        suggested_reply: qualification.suggested_reply,
        status,
        assigned_to: assignedTo,
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // 5. Modular Studio Automations
    // Check if auto-reply is enabled in environment or settings (default: true for WhatsApp inquiries)
    const autoReplyEnabled = process.env.ENABLE_AUTO_WHATSAPP_REPLY !== 'false';

    if (source === 'whatsapp' && autoReplyEnabled) {
      const replyText = qualification.suggested_reply;
      if (replyText) {
        console.log(`[Automation] Dispatching automated WhatsApp reply to ${contact}: "${replyText}"`);
        const sendRes = await sendWhatsAppMessage(contact, replyText);
        if (sendRes.success) {
          await supabaseAdmin.from('messages').insert({
            lead_id: leadId,
            direction: 'outbound',
            content: replyText,
            channel: 'whatsapp',
          });
        } else {
          console.error('[Automation] WhatsApp auto-reply failed:', sendRes.error);
        }
      }
    }

    // 6. Dispatch Resend Email Notification for Qualified Inquiries (score >= 60%)
    if (isQualified) {
      try {
        let ownerEmail: string | undefined = undefined;
        let specialistEmail: string | undefined = undefined;
        let specialistName = 'Lead Architect';

        if (leadRecord?.team_id) {
          const { data: ownerMember } = await supabaseAdmin
            .from('team_members')
            .select('email')
            .eq('team_id', leadRecord.team_id)
            .eq('role', 'owner')
            .single();
          if (ownerMember?.email) ownerEmail = ownerMember.email;
        }

        if (!ownerEmail) {
          const { data: recentOwner } = await supabaseAdmin
            .from('team_members')
            .select('contact, name')
            .limit(1)
            .single();
          if (recentOwner) ownerEmail = recentOwner.contact;
        }

        if (assignedTo) {
          const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('id, name, contact')
            .eq('id', assignedTo)
            .single();
          if (member) {
            specialistEmail = member.contact || undefined;
            specialistName = member.name || specialistName;
          }
        }

        const toEmail = ownerEmail || specialistEmail || process.env.PLATFORM_ADMIN_EMAIL || '25sampod@gmail.com';

        if (toEmail) {
          await sendLeadQualifiedNotification({
            lead: {
              id: leadId,
              name: leadRecord?.name || 'Prospective Client',
              contact,
              source,
              message: messageText,
              project_type: `${qualification.project_type || 'Architectural'} (${percentage}% Match · ${qualification.priority_tier.toUpperCase()})`,
              score,
              assigned_to: specialistName,
            },
            recipientEmail: toEmail,
            specialistEmail: specialistEmail !== toEmail ? specialistEmail : undefined,
          });
        }
      } catch (err) {
        console.error('Error dispatching lead qualification email:', err);
      }
    }
  } catch (error) {
    console.error('Error processing lead workflow:', error);
  }
}
