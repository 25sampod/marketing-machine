import { supabaseAdmin } from '../supabase';
import { qualifyLeadMessage } from '../ai/qualifyLead';
import { sendWhatsAppMessage } from '../whatsapp/api';
import { sendLeadQualifiedNotification } from '../email/resend';

export async function processNewLead(leadId: string, messageText: string, contact: string, source: string) {
  try {
    // 1. Qualify via AI
    const qualification = await qualifyLeadMessage(messageText);
    
    let score = 0;
    if (qualification.budget_mentioned) score += 1;
    if (qualification.project_type) score += 1;

    let status = 'new';
    let assignedTo = null;

    if (score >= 2) {
      status = 'qualified';
      // Skill-based routing
      if (qualification.project_type) {
        // Try to find a matching team member
        const { data: teamMembers } = await supabaseAdmin
          .from('team_members')
          .select('id, specialty');
          
        if (teamMembers && teamMembers.length > 0) {
          // simple match
          const match = teamMembers.find(member => 
            member.specialty?.toLowerCase() === qualification.project_type?.toLowerCase()
          );
          if (match) {
            assignedTo = match.id;
          } else {
            // Round robin fallback (just pick first for MVP)
            assignedTo = teamMembers[0].id;
          }
        }
      }
    }

    // 2. Update lead in DB
    await supabaseAdmin
      .from('leads')
      .update({
        budget_mentioned: qualification.budget_mentioned,
        project_type: qualification.project_type,
        score,
        status,
        assigned_to: assignedTo,
      })
      .eq('id', leadId);

    // 3. Automated Auto-Reply
    if (status === 'new' && score < 2) {
      // Ask for missing info
      let replyText = "Thanks for reaching out! To help us better assist you, ";
      if (!qualification.budget_mentioned && !qualification.project_type) {
        replyText += "could you share a bit about your project type and estimated budget?";
      } else if (!qualification.budget_mentioned) {
        replyText += "could you give us a rough idea of your budget?";
      } else if (!qualification.project_type) {
        replyText += "could you tell us what type of project this is (e.g. Residential, Commercial)?";
      }

      // Send via WhatsApp if source is whatsapp
      if (source === 'whatsapp') {
        await sendWhatsAppMessage(contact, replyText);
      }

      // Log outbound message to DB
      await supabaseAdmin
        .from('messages')
        .insert({
          lead_id: leadId,
          direction: 'outbound',
          content: replyText,
          channel: source,
        });
    } else if (status === 'qualified') {
      const replyText = "Thanks for the details! Your project looks like a great fit. One of our specialists will be in touch shortly.";
      
      if (source === 'whatsapp') {
        await sendWhatsAppMessage(contact, replyText);
      }
      
      await supabaseAdmin
        .from('messages')
        .insert({
          lead_id: leadId,
          direction: 'outbound',
          content: replyText,
          channel: source,
        });

      // Dispatch Resend email notification directly to individual Google user
      try {
        const { data: leadRecord } = await supabaseAdmin
          .from('leads')
          .select('name, team_id')
          .eq('id', leadId)
          .single();

        let ownerEmail: string | undefined = undefined;
        let specialistEmail: string | undefined = undefined;
        let specialistName = 'Practice Specialist';

        // Resolve owner's Google email for this team
        if (leadRecord?.team_id) {
          const { data: ownerMember } = await supabaseAdmin
            .from('team_members')
            .select('email')
            .eq('team_id', leadRecord.team_id)
            .eq('role', 'owner')
            .single();
          if (ownerMember?.email) ownerEmail = ownerMember.email;
        }

        // Fallback: check most recently active studio owner
        if (!ownerEmail) {
          const { data: recentOwner } = await supabaseAdmin
            .from('team_members')
            .select('email')
            .eq('role', 'owner')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (recentOwner?.email) ownerEmail = recentOwner.email;
        }

        // Resolve specialist partner's email if assigned
        if (assignedTo) {
          const { data: member } = await supabaseAdmin
            .from('team_members')
            .select('id, name, contact')
            .eq('id', assignedTo)
            .single();
          if (member) {
            specialistEmail = (member as any).contact || (member as any).email || undefined;
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
              project_type: qualification.project_type || undefined,
              score,
              assigned_to: specialistName,
            },
            recipientEmail: toEmail,
            specialistEmail: specialistEmail !== toEmail ? specialistEmail : undefined,
          });
        }
      } catch (err) {
        console.error('Error triggering lead qualified email:', err);
      }
    }

  } catch (error) {
    console.error('Error processing new lead:', error);
  }
}
