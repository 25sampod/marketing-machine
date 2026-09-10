import OpenAI, { AzureOpenAI } from 'openai';

const useAzure = !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT;

const openai = useAzure
  ? new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano',
      apiVersion: '2024-04-01-preview',
    })
  : new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
    });

export interface HistoricalContext {
  previousProjectType?: string | null;
  previousBudget?: string | null;
  previousPercentage?: number | null;
  previousSummary?: string | null;
  recentMessages?: Array<{ direction: string; content: string }>;
}

export interface QualificationResult {
  qualification_percentage: number; // 0 - 100
  priority_tier: 'urgent' | 'high' | 'medium' | 'low';
  budget_mentioned: boolean;
  estimated_budget: string | null;
  project_type: string | null;
  timeline: string | null;
  key_insights: string;
  suggested_reply: string;
}

export async function qualifyLeadMessage(
  message: string,
  history?: HistoricalContext
): Promise<QualificationResult> {
  const fallbackProjectType =
    message.toLowerCase().includes('commercial')
      ? 'Commercial'
      : message.toLowerCase().includes('residential') || message.toLowerCase().includes('villa')
      ? 'Residential'
      : message.toLowerCase().includes('renovation')
      ? 'Renovation'
      : history?.previousProjectType || null;

  const fallbackBudgetMentioned =
    message.includes('$') ||
    /\b(budget|usd|k|thousand|million)\b/i.test(message) ||
    Boolean(history?.previousBudget);

  if (!process.env.OPENAI_API_KEY && !process.env.AZURE_OPENAI_API_KEY) {
    console.warn('No AI API Key found, using heuristic qualification.');
    const percentage = fallbackBudgetMentioned && fallbackProjectType ? 80 : fallbackProjectType ? 50 : 25;
    return {
      qualification_percentage: percentage,
      priority_tier: percentage >= 75 ? 'high' : percentage >= 50 ? 'medium' : 'low',
      budget_mentioned: fallbackBudgetMentioned,
      estimated_budget: fallbackBudgetMentioned ? 'Mentioned in text' : null,
      project_type: fallbackProjectType,
      timeline: 'Not specified',
      key_insights: `Lead inquired regarding ${fallbackProjectType || 'architectural services'}.`,
      suggested_reply: `Thanks for contacting ArchScale! We'd love to learn more about your ${fallbackProjectType || 'project'}. When is a good time for a brief consultation call?`,
    };
  }

  try {
    const historicalContextText = history
      ? `
HISTORICAL CLIENT CONTEXT (Returning Contact):
- Previous Project Typology: ${history.previousProjectType || 'None'}
- Previous Budget Recorded: ${history.previousBudget || 'None'}
- Previous AI Summary: ${history.previousSummary || 'None'}
- Recent Conversation Messages:
${(history.recentMessages || [])
  .slice(-4)
  .map((m) => `  [${m.direction.toUpperCase()}]: ${m.content}`)
  .join('\n')}
`
      : 'No prior contact history — new first-time inquiry.';

    const response = await openai.chat.completions.create({
      model: useAzure ? process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an executive architectural lead qualification expert for "ArchScale", a high-end architecture and spatial design studio.
Evaluate the incoming inquiry and output a detailed architectural lead scoring assessment.

${historicalContextText}

EVALUATION CRITERIA (0 to 100 points total):
1. Budget Viability & Scale (0–35 points):
   - Clear architectural budget mentioned (e.g. $50k, $120,000, $500k+): High score (25–35 pts)
   - Unrealistic/micro budget (e.g. $50): Lower score (5–10 pts)
   - Budget not mentioned: 0 pts
2. Project Typology & Scope (0–25 points):
   - Defined scope (e.g. Residential Villa, Commercial Headquarters, Interior Renovation, Master Planning): 20–25 pts
   - Generic/vague scope: 10 pts
   - No project scope: 0 pts
3. Commercial Intent & Meeting Urgency (0–25 points):
   - Specific inquiry asking to meet, timeline, start date, or hire: 20–25 pts
   - General inquiry: 10 pts
   - Casual greeting ("hi"): 0 pts
4. Property / Site Readiness (0–15 points):
   - Site/land acquired, location specified, or existing structure: 10–15 pts

PRIORITY TIERS:
- 85–100: "urgent" (Immediate VIP discovery call required)
- 70–84: "high" (Qualified project with budget and scope)
- 40–69: "medium" (Promising inquiry, needs scope/budget clarification)
- 0–39: "low" (Vague greeting or low readiness)

CUMULATIVE CONTEXT RULE:
Synthesize past history with this new message. If the contact previously had a partial inquiry and now provides a substantial budget or project scope, re-verify and upgrade their cumulative score!

SUGGESTED REPLY RULE:
Draft a concise, warm, highly professional 2-sentence WhatsApp reply suitable for an architectural studio principal.

Respond ONLY in valid JSON matching this schema:
{
  "qualification_percentage": number (0-100),
  "priority_tier": "urgent" | "high" | "medium" | "low",
  "budget_mentioned": boolean,
  "estimated_budget": string or null,
  "project_type": string or null ("Residential", "Commercial", "Renovation", "Master Planning", "Interior"),
  "timeline": string or null,
  "key_insights": string (concise 1-sentence summary of client and project),
  "suggested_reply": string
}`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      const percentage = Math.min(100, Math.max(0, Number(parsed.qualification_percentage) || 0));
      return {
        qualification_percentage: percentage,
        priority_tier: ['urgent', 'high', 'medium', 'low'].includes(parsed.priority_tier)
          ? parsed.priority_tier
          : percentage >= 75
          ? 'high'
          : percentage >= 50
          ? 'medium'
          : 'low',
        budget_mentioned: Boolean(parsed.budget_mentioned),
        estimated_budget: parsed.estimated_budget || null,
        project_type: parsed.project_type || fallbackProjectType,
        timeline: parsed.timeline || null,
        key_insights: parsed.key_insights || 'Architectural inquiry received.',
        suggested_reply:
          parsed.suggested_reply ||
          `Thank you for contacting ArchScale! We would be delighted to discuss your project. When is convenient for a quick consultation?`,
      };
    }
  } catch (error) {
    console.error('Failed to qualify lead via Azure OpenAI:', error);
  }

  return {
    qualification_percentage: fallbackBudgetMentioned && fallbackProjectType ? 75 : 30,
    priority_tier: fallbackBudgetMentioned && fallbackProjectType ? 'high' : 'low',
    budget_mentioned: fallbackBudgetMentioned,
    estimated_budget: null,
    project_type: fallbackProjectType,
    timeline: null,
    key_insights: 'Inquiry received via WhatsApp.',
    suggested_reply: 'Thanks for reaching out! When would you like to schedule a discovery call?',
  };
}
