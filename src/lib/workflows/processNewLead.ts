import { supabaseAdmin } from '../supabase';
import { qualifyLeadMessage, HistoricalContext, QualificationResult } from '../ai/qualifyLead';
import { 
  executeFallbackHeuristicScorer, 
  parseBudgetMention, 
  parseScopeKeywords, 
  parseTimelineUrgency,
  isClientDecliningOrOptingOut
} from '../ai/fallbackScorer';
import { sendWhatsAppMessage } from '../whatsapp/api';
import { sendLeadQualifiedNotification, sendClientWelcomeEmail } from '../email/resend';
import { sendTelegramLeadAlert } from '../telegram/bot';

export async function processNewLead(
  leadId: string,
  messageText: string,
  contact: string,
  source: string
) {
  try {
    // 1. Fetch current lead data, studio knowledge base, and historical conversation context
    const { data: leadRecord } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    const { data: studioSettings } = await supabaseAdmin
      .from('studio_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

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
      knowledgeBase: studioSettings?.knowledge_base || null,
    };

    // 2. Qualify via Azure OpenAI or immediately fall back to rule-based Heuristic Scorer
    let qualification: QualificationResult;
    let usedFallbackScorer = false;

    try {
      qualification = await qualifyLeadMessage(messageText, history);
      if (!qualification || typeof qualification.qualification_percentage !== 'number') {
        throw new Error('Invalid structure returned from AI qualification');
      }
    } catch (aiErr) {
      console.warn(`[Discovery Automation] Azure OpenAI qualification failed/timed out for lead ${leadId}. Executing Fallback Heuristic Scorer:`, aiErr);
      qualification = executeFallbackHeuristicScorer(messageText, history, leadRecord);
      usedFallbackScorer = true;
    }

    // 2b. Check if client explicitly declined, cancelled, or opted out
    const isDeclined = isClientDecliningOrOptingOut(messageText) || qualification.discovery_stage === 'lost';
    if (isDeclined) {
      console.log(`[Discovery Automation] Lead ${leadId} (${contact}) explicitly declined or opted out. Setting status=lost and LPI=0.`);
      const farewellReply = qualification.suggested_reply || 'Understood completely! Thank you for letting us know. If your plans change in the future, our team will be here to help.';
      
      await supabaseAdmin
        .from('leads')
        .update({
          status: 'lost',
          score: 0,
          qualification_percentage: 0,
          priority_tier: 'low',
          discovery_stage: 'lost',
          ai_summary: qualification.key_insights || 'Client explicitly stated they do not want to proceed with this commission.',
          suggested_reply: farewellReply,
          automation_enabled: false,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      const globalAutoReplyEnabled = studioSettings?.auto_reply_enabled !== false && process.env.ENABLE_AUTO_WHATSAPP_REPLY !== 'false';
      if (source === 'whatsapp' && globalAutoReplyEnabled && farewellReply) {
        const sendRes = await sendWhatsAppMessage(contact, farewellReply);
        if (sendRes.success) {
          await supabaseAdmin.from('messages').insert({
            lead_id: leadId,
            direction: 'outbound',
            content: farewellReply,
            channel: 'whatsapp',
          });
        }
      }
      return;
    }

    // Dynamic extraction: parse newly incoming qualifying details (budget, scope, timeline)
    const heuristicBudget = parseBudgetMention(messageText);
    const heuristicScope = parseScopeKeywords(messageText);
    const heuristicTimeline = parseTimelineUrgency(messageText);

    // Preserve previously extracted data across multi-turn messages and incorporate newly arrived signals
    const finalProjectType = heuristicScope || qualification.project_type || leadRecord?.project_type || null;
    const finalEstimatedBudget = heuristicBudget.budget || qualification.estimated_budget || leadRecord?.estimated_budget || null;
    const finalTimeline = heuristicTimeline.timeline || qualification.timeline || leadRecord?.timeline || null;
    const finalBudgetMentioned = Boolean(heuristicBudget.mentioned || qualification.budget_mentioned || leadRecord?.budget_mentioned || finalEstimatedBudget);
    const finalIsReturning = Boolean(qualification.is_returning_client || leadRecord?.is_returning_client);
    const finalPercentage = Math.min(100, Math.max(0, qualification.qualification_percentage ?? 0));

    // 3. Dynamic Multi-factor Lead Priority Index (LPI: 0 - 100) using runtime studio_settings weights
    const weightQual = typeof studioSettings?.weight_qualification === 'number' ? studioSettings.weight_qualification : 40;
    const weightBudget = typeof studioSettings?.weight_budget === 'number' ? studioSettings.weight_budget : 25;
    const weightScope = typeof studioSettings?.weight_scope === 'number' ? studioSettings.weight_scope : 15;
    const weightTimeline = typeof studioSettings?.weight_timeline === 'number' ? studioSettings.weight_timeline : 10;
    const weightReturning = typeof studioSettings?.weight_returning === 'number' ? studioSettings.weight_returning : 10;

    let lpiScore = 0;
    // Base qualification percentage (0 - weightQual pts)
    lpiScore += Math.round((finalPercentage / 100) * weightQual);

    // Budget Depth (0 - weightBudget pts) using normalized numeric value to reliably handle formatting & commas
    if (finalEstimatedBudget) {
      const parsedBudget = parseBudgetMention(finalEstimatedBudget);
      const amount = parsedBudget.rawAmount;
      if (amount !== null && amount > 0) {
        if (amount >= 100_000) {
          lpiScore += weightBudget;
        } else if (amount >= 20_000) {
          lpiScore += Math.round(weightBudget * 0.8);
        } else if (amount >= 5_000) {
          lpiScore += Math.round(weightBudget * 0.6);
        } else {
          lpiScore += Math.round(weightBudget * 0.4);
        }
      } else if (finalBudgetMentioned) {
        lpiScore += Math.round(weightBudget * 0.3);
      }
    } else if (finalBudgetMentioned) {
      lpiScore += Math.round(weightBudget * 0.3);
    }

    // Scope & Typology Clarity (0 - weightScope pts)
    if (finalProjectType) {
      lpiScore += weightScope;
    }

    // Timeline Urgency (0 - weightTimeline pts)
    if (finalTimeline && !finalTimeline.toLowerCase().includes('not specified')) {
      const t = finalTimeline.toLowerCase();
      if (t.includes('asap') || t.includes('immediate') || t.includes('urgent') || t.includes('week') || t.includes('today') || t.includes('tomorrow')) {
        lpiScore += weightTimeline;
      } else if (t.includes('month') || t.includes('soon')) {
        lpiScore += Math.round(weightTimeline * 0.6);
      } else {
        lpiScore += Math.round(weightTimeline * 0.3);
      }
    }

    // VIP / Returning Client Loyalty (0 - weightReturning pts)
    if (finalIsReturning) {
      lpiScore += weightReturning;
    }

    const score = Math.min(100, Math.max(0, lpiScore));
    const priorityTier =
      score >= 80 ? 'urgent' :
      score >= 60 ? 'high' :
      score >= 35 ? 'medium' : 'low';

    const previousScore = leadRecord?.score ?? 0;
    const previousTier = leadRecord?.priority_tier ?? 'low';

    // 4. Determine qualification status based on studio qualification_threshold & multi-factor LPI score
    const qualificationThreshold = typeof studioSettings?.qualification_threshold === 'number'
      ? studioSettings.qualification_threshold
      : 70;
    const previousStatus = leadRecord?.status || 'new';
    let status = previousStatus;
    const meetsLpiThreshold = score >= qualificationThreshold;
    if (['new', 'contacted', 'qualified'].includes(previousStatus)) {
      status = meetsLpiThreshold ? 'qualified' : 'contacted';
    }
    const justQualified = previousStatus !== 'qualified' && status === 'qualified';

    // Append dynamic score audit to lpi_history table
    try {
      const { error: auditErr } = await supabaseAdmin.from('lpi_history').insert({
        lead_id: leadId,
        score,
        previous_score: previousScore,
        priority_tier: priorityTier,
        inputs: {
          budget: finalEstimatedBudget,
          scope: finalProjectType,
          timeline: finalTimeline,
          qualification_percentage: finalPercentage,
          is_returning: finalIsReturning,
          fallback_scorer_used: usedFallbackScorer,
          trigger_message: messageText,
        },
        scored_at: new Date().toISOString(),
      });
      if (auditErr) {
        console.warn('[LPI Engine] Notice logging to lpi_history:', auditErr.message);
      } else {
        console.log(`[LPI Engine] Re-computed LPI: ${score} (tier: ${priorityTier}, prev: ${previousScore}) for lead ${leadId}`);
      }
    } catch (auditException) {
      console.warn('[LPI Engine] Exception logging to lpi_history:', auditException);
    }

    let assignedTo = leadRecord?.assigned_to || null;
    let assignedSpecialistName = 'Lead Specialist';

    // 5. Specialty routing if not already assigned
    if (status === 'qualified' && !assignedTo && finalProjectType) {
      const { data: teamMembers } = await supabaseAdmin
        .from('team_members')
        .select('id, name, specialty, role');

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
        const chosen = match || teamMembers[0];
        assignedTo = chosen.id;
        assignedSpecialistName = chosen.name || assignedSpecialistName;
      }
    }

    // 5. Persist updated lead intelligence, LPI score, & discovery stage
    await supabaseAdmin
      .from('leads')
      .update({
        budget_mentioned: finalBudgetMentioned,
        project_type: finalProjectType,
        score,
        qualification_percentage: finalPercentage,
        priority_tier: priorityTier,
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

    // 5. Modular Studio Automations (using studioSettings fetched in step 1)

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

    // 6a. Dispatch Automated Client Welcome Email if lead inquiry was captured with an email address
    if (contact.includes('@') && emailAlertsEnabled) {
      try {
        const studioName = studioSettings?.name || 'ArchScale Studio';
        const whatsappNumber = studioSettings?.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
        await sendClientWelcomeEmail({
          toEmail: contact,
          clientName: leadRecord?.name || 'Client',
          projectType: finalProjectType || undefined,
          message: messageText,
          specialistName: assignedSpecialistName,
          studioName,
          whatsappContact: whatsappNumber,
        });

        // Record outbound email log in messages table
        await supabaseAdmin.from('messages').insert({
          lead_id: leadId,
          direction: 'outbound',
          content: `[Automated Confirmation Email sent to ${contact}]`,
          channel: 'email',
        });
      } catch (welcomeErr) {
        console.warn('[Discovery Automation] Notice dispatching client welcome email:', welcomeErr);
      }
    }

    // 6b. Dispatch Resend Email & Telegram Notification to Studio Team when lead qualifies for the first time
    if (justQualified) {
      if (emailAlertsEnabled) {
        try {
          let ownerEmail: string | undefined = undefined;
          let specialistEmail: string | undefined = undefined;
          let specialistName = 'Lead Architect';

          // 1. Studio configured notification email in studio_settings (highest priority)
          const studioNotificationEmail = studioSettings?.notification_email?.trim() || null;

          if (leadRecord?.team_id) {
            const { data: ownerMember } = await supabaseAdmin
              .from('team_members')
              .select('email')
              .eq('team_id', leadRecord.team_id)
              .eq('role', 'owner')
              .single();
            if (ownerMember?.email && ownerMember.email.includes('@')) ownerEmail = ownerMember.email.trim();
          }

          if (!ownerEmail) {
            const { data: recentOwner } = await supabaseAdmin
              .from('team_members')
              .select('contact, name')
              .limit(1)
              .single();
            if (recentOwner?.contact && recentOwner.contact.includes('@')) ownerEmail = recentOwner.contact.trim();
          }

          if (assignedTo) {
            const { data: member } = await supabaseAdmin
              .from('team_members')
              .select('id, name, contact')
              .eq('id', assignedTo)
              .single();
            if (member) {
              if (member.contact && member.contact.includes('@')) specialistEmail = member.contact.trim();
              specialistName = member.name || specialistName;
            }
          }

          const toEmail =
            studioNotificationEmail ||
            ownerEmail ||
            specialistEmail ||
            process.env.NOTIFICATION_EMAIL ||
            process.env.PLATFORM_ADMIN_EMAIL;

          if (toEmail && toEmail.includes('@')) {
            const clientTypeTag = qualification.is_returning_client ? 'RETURNING CLIENT' : 'NEW LEAD';
            await sendLeadQualifiedNotification({
              lead: {
                id: leadId,
                name: leadRecord?.name || 'Client',
                contact,
                source,
                message: messageText,
                project_type: `${finalProjectType || 'Architectural'} [${clientTypeTag} · LPI ${score}/100 (${finalPercentage}% Match) · ${priorityTier.toUpperCase()}]`,
                score,
                assigned_to: specialistName,
              },
              recipientEmail: toEmail,
              specialistEmail: specialistEmail && specialistEmail !== toEmail ? specialistEmail : undefined,
            });
          }
        } catch (err) {
          console.error('Error dispatching lead qualification email:', err);
        }
      }

      // Dispatch real-time alert to Telegram channel
      try {
        await sendTelegramLeadAlert({
          name: leadRecord?.name || 'Client',
          contact,
          projectType: finalProjectType,
          budget: finalEstimatedBudget,
          score,
          priorityTier,
          assignedSpecialist: assignedSpecialistName,
          aiSummary: qualification.key_insights,
          leadId,
        });
      } catch (tgErr) {
        console.error('Error dispatching Telegram alert:', tgErr);
      }
    }
  } catch (error) {
    console.error('Error processing discovery lead workflow:', error);
  }
}
