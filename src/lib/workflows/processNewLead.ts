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
      .select('direction, content, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: false })
      .limit(10);

    const orderedPastMessages = pastMessages ? [...pastMessages].reverse() : [];

    const isReturning = Boolean(leadRecord?.is_returning_client);

    const history: HistoricalContext = {
      previousProjectType: leadRecord?.project_type,
      previousBudget: leadRecord?.estimated_budget,
      previousPercentage: leadRecord?.qualification_percentage,
      previousSummary: leadRecord?.ai_summary,
      recentMessages: orderedPastMessages,
      isReturningClient: isReturning,
      currentStage: leadRecord?.discovery_stage || 'discovery',
    };

    // 2. Qualify via Azure OpenAI with discovery interviewer & client history
    const qualification = await qualifyLeadMessage(messageText, history);

    // Preserve previously extracted data across multi-turn messages to prevent amnesia
    const finalProjectType = qualification.project_type || leadRecord?.project_type || null;
    const finalEstimatedBudget = qualification.estimated_budget || leadRecord?.estimated_budget || null;
    const finalTimeline = qualification.timeline || leadRecord?.timeline || null;
    const finalBudgetMentioned = Boolean(qualification.budget_mentioned || leadRecord?.budget_mentioned || finalEstimatedBudget);
    const finalIsReturning = Boolean(qualification.is_returning_client || leadRecord?.is_returning_client);
    const finalPercentage = Math.max(qualification.qualification_percentage, leadRecord?.qualification_percentage || 0);

    const isEscorted = qualification.discovery_stage === 'escorted' || finalPercentage >= 75;
    const status = isEscorted || finalPercentage >= 60 || leadRecord?.status === 'qualified' ? 'qualified' : 'new';
    const score = finalPercentage >= 70 ? 2 : finalPercentage >= 40 ? 1 : 0;

    let assignedTo = leadRecord?.assigned_to || null;

    // 3. Specialty routing if not already assigned
    if (status === 'qualified' && !assignedTo && finalProjectType) {
      const { data: teamMembers } = await supabaseAdmin
        .from('team_members')
        .select('id, specialty, role');

      if (teamMembers && teamMembers.length > 0) {
        const pType = finalProjectType.toLowerCase();
        const match = teamMembers.find((m) => {
          if (!m.specialty) return false;
          const spec = m.specialty.toLowerCase();
          return (
            spec === pType ||
            pType.includes(spec) ||
            spec.includes(pType) ||
            spec.split(/\s+/).some((w: string) => w.length > 3 && pType.includes(w))
          );
        });
        assignedTo = match ? match.id : teamMembers[0].id;
      }
    }

    // 4. Persist updated lead intelligence & discovery stage
    await supabaseAdmin
      .from('leads')
      .update({
        budget_mentioned: finalBudgetMentioned,
        project_type: finalProjectType,
        score,
        qualification_percentage: finalPercentage,
        priority_tier: qualification.priority_tier,
        is_returning_client: finalIsReturning,
        discovery_stage: qualification.discovery_stage,
        ai_summary: qualification.key_insights || leadRecord?.ai_summary,
        estimated_budget: finalEstimatedBudget,
        timeline: finalTimeline,
        suggested_reply: qualification.suggested_reply,
        status,
        assigned_to: assignedTo,
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // 5. Modular Studio Automations
    // Fetch live studio settings from database
    const { data: studioSettings } = await supabaseAdmin
      .from('studio_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    // Check per-lead automation toggle (default: true if column is true or not explicitly false)
    const leadAutomationEnabled = leadRecord?.automation_enabled !== false;
    const globalAutoReplyEnabled = studioSettings?.auto_reply_enabled !== false && process.env.ENABLE_AUTO_WHATSAPP_REPLY !== 'false';
    const emailAlertsEnabled = studioSettings?.email_alerts_enabled !== false;
    const discoveryInterviewerEnabled = studioSettings?.discovery_interviewer_enabled !== false;
    const returningClientMode = studioSettings?.returning_client_mode || 'auto';

    // Determine if auto-dispatch is allowed:
    // If the studio master switch is on and this lead's Autonomous Responses is active,
    // only suppress if studio settings specifically disabled that tier.
    let clientModeAllowed = true;
    if (finalIsReturning) {
      if (returningClientMode === 'disabled') clientModeAllowed = false;
    } else {
      if (!discoveryInterviewerEnabled) clientModeAllowed = false;
    }

    const shouldSendAutoReply =
      source === 'whatsapp' &&
      leadAutomationEnabled &&
      globalAutoReplyEnabled &&
      clientModeAllowed;

    if (shouldSendAutoReply) {
      const replyText = qualification.suggested_reply;
      if (replyText) {
        console.log(`[Discovery Automation] Dispatching WhatsApp response to ${contact} (${qualification.discovery_stage}): "${replyText}"`);
        const sendRes = await sendWhatsAppMessage(contact, replyText);
        if (sendRes.success) {
          await supabaseAdmin.from('messages').insert({
            lead_id: leadId,
            direction: 'outbound',
            content: replyText,
            channel: 'whatsapp',
          });
        } else {
          console.error('[Discovery Automation] WhatsApp dispatch failed:', sendRes.error);
        }
      }
    } else {
      console.log(`[Discovery Automation] Auto-reply skipped for ${contact} (leadAuto=${leadAutomationEnabled}, globalAuto=${globalAutoReplyEnabled}, isReturning=${qualification.is_returning_client}, returningMode=${returningClientMode}, discoveryInterviewer=${discoveryInterviewerEnabled}). Draft prepared.`);
    }

    // 6. Dispatch Resend Email Notification when lead reaches Escorted or Qualified (percentage >= 60%)
    if (status === 'qualified' && emailAlertsEnabled) {
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
          const clientTypeTag = qualification.is_returning_client ? 'RETURNING CLIENT' : 'NEW LEAD';
          await sendLeadQualifiedNotification({
            lead: {
              id: leadId,
              name: leadRecord?.name || 'Client',
              contact,
              source,
              message: messageText,
              project_type: `${finalProjectType || 'Architectural'} [${clientTypeTag} · ${finalPercentage}% Match · ${qualification.priority_tier.toUpperCase()}]`,
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
    console.error('Error processing discovery lead workflow:', error);
  }
}
