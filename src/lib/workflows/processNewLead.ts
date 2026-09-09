import { supabaseAdmin } from '../supabase';
import { qualifyLeadMessage } from '../ai/qualifyLead';
import { sendWhatsAppMessage } from '../whatsapp/api';

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
    }

  } catch (error) {
    console.error('Error processing new lead:', error);
  }
}
