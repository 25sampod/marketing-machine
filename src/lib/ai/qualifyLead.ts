import OpenAI from 'openai';
import { executeFallbackHeuristicScorer } from './fallbackScorer';
import { getStudioSettings } from '../settings';
import { createAiClient, StudioSettingsCredentials } from '../settingsResolver';

export { createAiClient };

export interface HistoricalContext {
  previousProjectType?: string | null;
  previousBudget?: string | null;
  previousPercentage?: number | null;
  previousSummary?: string | null;
  recentMessages?: Array<{ direction: string; content: string }>;
  isReturningClient?: boolean;
  currentStage?: string | null;
  knowledgeBase?: string | null;
}

export interface QualificationResult {
  qualification_percentage: number; // 0 - 100
  priority_tier: 'urgent' | 'high' | 'medium' | 'low';
  is_returning_client: boolean;
  discovery_stage: 'discovery' | 'needs_scope' | 'needs_budget' | 'confirmed' | 'escorted' | 'lost';
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
  const isReturning = Boolean(history?.isReturningClient);

  const settings = await getStudioSettings();
  const aiSetup = createAiClient(settings);

  if (!aiSetup) {
    console.warn('No AI API Key found in Studio Settings or environment, using fallback heuristic scorer.');
    return executeFallbackHeuristicScorer(message, history);
  }

  try {
    const studioKnowledgeText = history?.knowledgeBase?.trim()
      ? `
AUTHENTIC STUDIO KNOWLEDGE BASE (Defined by Studio Owner):
"""
${history.knowledgeBase.trim()}
"""

INSTRUCTION ON STUDIO SERVICES & PACKAGES:
- Answer inquiries regarding our studio, packages, offerings, and scope strictly using the STUDIO KNOWLEDGE BASE above.
- NEVER invent or assume services, packages, or pricing that are not mentioned in this knowledge base.
- When the client asks about packages or options, summarize the options from the knowledge base concisely and ask which tier best matches their goals.
`
      : `
STUDIO IDENTITY & OFFERINGS:
We are a premier digital product, design, and web development studio.
When asked about website packages, offer:
• Starter (1–3 pages): quick, mobile-ready site.
• Growth (5–10 pages): SEO & lead capture.
• Pro/Store: custom ecommerce & integrations.
`;

    const historicalContextText = history
      ? `
CLIENT CONTEXT & RECORD:
- Client Status: ${isReturning ? 'RETURNING CLIENT / PREVIOUS RELATIONSHIP' : 'NEW PROSPECTIVE CLIENT'}
- Current Discovery Stage: ${history.currentStage || 'discovery'}
- Known Project Scope: ${history.previousProjectType || 'None yet'}
- Known Budget: ${history.previousBudget || 'None yet'}
- Previous AI Summary: ${history.previousSummary || 'None yet'}
`
      : 'CLIENT CONTEXT: BRAND NEW CLIENT (First message). Current Discovery Stage: discovery.';

    // Construct true multi-turn chat messages array
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a senior team consultant communicating on WhatsApp on behalf of our studio team.

${studioKnowledgeText}

${historicalContextText}

CORE DIRECTIVES & PERSONA:
1. TEAM / COMPANY IDENTITY (YOU ARE NOT AN AI):
   - Speak as a real member of our studio team ("we", "our team", "our studio").
   - NEVER refer to yourself as an AI, bot, virtual assistant, language model, or automated assistant.
   - You are NOT a search engine, encyclopedia, or general-knowledge bot.
   - Strictly represent our studio's services and capabilities.

2. STRICT REDIRECTION OF OFF-TOPIC / TRIVIA / CASUAL QUESTIONS:
   - If the user asks about tech figures (e.g. Mark Zuckerberg, Elon Musk), general trivia, celebrities, weather, jokes, or random non-business topics:
   - DO NOT answer the trivia or give biographical/encyclopedic definitions.
   - DO NOT act like ChatGPT.
   - Politely, warmly, and playfully steer them back to our studio's products and services:
     Example: "Haha, while we keep up with tech news, our team is strictly focused on building high-performance solutions for businesses! Let's talk about your project—what kind of project are you looking to launch?"

3. CONCISE, PUNCHY & TOKEN-EFFICIENT (WHATSAPP SIZED):
   - Keep suggested replies BRIEF, CRISP, and TO THE POINT (strict limit: 35–60 words, 2–3 short sentences maximum).
   - Avoid walls of text, long disclaimers, or exhaustive feature lists.
   - When presenting packages or services, provide an ultra-compact summary (1 line per option) followed by a short question: "Which option matches what you're looking to achieve?"
   - NEVER repeat what you already explained in previous messages. If packages were already sent earlier in the chat, DO NOT re-list them.

4. NO UNSOLICITED ASSUMPTIONS OR BUDGET FABRICATION:
   - NEVER make up or cite a budget (such as "$100k") unless the client specifically typed that budget in this chat.
   - Address only what the client is asking right now.

5. NATURAL CONVERSATION FLOW & MEMORY:
   - NEVER say "I don't have access to prior messages", "I cannot see previous messages", or make robotic memory excuses. You DO have the conversation history.
   - If a client insists they already told you a budget or detail, but it was never actually mentioned in the chat messages: DO NOT argue or say you don't have history. Respond naturally as a human teammate:
     Example: "I reviewed our chat above and don't see a specific number recorded yet—what range did you have in mind so we can lock it in for the Starter?"
   - If there is prior message history, NEVER repeat greeting lines ("Hello", "Thanks for reaching out"). Jump directly into the answer.
    - When project scope is clearly stated (e.g. residential villa, commercial build, office interior):
      - Assign a high "qualification_percentage" (80-95%) based strictly on project fit and serious client intent.
      - DO NOT penalize "qualification_percentage" simply because the client has not stated a budget figure yet. Budget is scored separately under Budget Depth.
    - When project scope and budget are both confirmed:
      - Set "discovery_stage" to "escorted" and "qualification_percentage" >= 85.
      - Inform them succinctly that our team will be in touch to schedule their kickoff consultation.
    - CLIENT CANCELLATION / OPTOUT / DECLINED:
      - If the client explicitly states they do not want to proceed (e.g. "dont want any", "dont want that anymore", "not interested", "cancel", "stop", "no thanks", "nevermind", "changed my mind"):
      - Set "discovery_stage" to "lost".
      - Set "qualification_percentage" to 0.
      - Set "priority_tier" to "low".
      - In "key_insights", state clearly that the client declined or opted out.
      - In "suggested_reply", provide a brief, polite, closing response acknowledging their decision.

Respond ONLY in valid JSON matching this schema:
{
  "qualification_percentage": number (0-100),
  "priority_tier": "urgent" | "high" | "medium" | "low",
  "is_returning_client": boolean,
  "discovery_stage": "discovery" | "needs_scope" | "needs_budget" | "confirmed" | "escorted" | "lost",
  "budget_mentioned": boolean,
  "estimated_budget": string or null (e.g. "$4,000", "$100k", or null),
  "project_type": string or null (e.g. "Residential Villa", "Commercial", "Small Business Website"),
  "timeline": string or null,
  "key_insights": string (1-sentence executive summary of their inquiry),
  "suggested_reply": string
}`,
      },
    ];

    // Append previous messages from history to provide true multi-turn conversational context
    let priorMessages = (history?.recentMessages || []).slice(-8);
    // If the last message in history is the exact inbound message just inserted, exclude it so it's not duplicated
    if (
      priorMessages.length > 0 &&
      priorMessages[priorMessages.length - 1].content.trim() === message.trim() &&
      priorMessages[priorMessages.length - 1].direction === 'inbound'
    ) {
      priorMessages = priorMessages.slice(0, -1);
    }

    for (const m of priorMessages) {
      if (!m.content) continue;
      chatMessages.push({
        role: m.direction === 'outbound' ? 'assistant' : 'user',
        content: m.content,
      });
    }

    // Append the latest user message
    chatMessages.push({
      role: 'user',
      content: message,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: any;
    try {
      const modelName = aiSetup.modelName;
      const isReasoningModel = /^(o1|o3|gpt-5)/i.test(modelName);

      const requestPayload: any = {
        model: modelName,
        messages: chatMessages,
        response_format: { type: 'json_object' },
        max_completion_tokens: 800,
      };

      if (isReasoningModel) {
        requestPayload.reasoning_effort = 'low';
      }

      response = await (aiSetup.client.chat.completions.create as any)(requestPayload, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const content = response?.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const percentage = Math.min(100, Math.max(0, Number(parsed.qualification_percentage) || 0));

      // Extract explicit budget mention from text if model missed it
      const rawBudgetMatch = message.match(
        /(?:\$|usd\s*|\bbudget\b(?:\s+(?:is|of|around|approx|about|close to))+\s*\$?)\s*([\d,]+(?:\s*(?:k|kilo|thousand|million|m|b))?)|(\b\d+[\d,]*\s*(?:k|kilo|thousand|million|usd|dollars)\b)/i
      );
      const fallbackExtractedBudget = rawBudgetMatch
        ? (rawBudgetMatch[1] || rawBudgetMatch[2] || rawBudgetMatch[0]).trim()
        : null;
      const cleanedBudget = fallbackExtractedBudget
        ? (/^\d+/.test(fallbackExtractedBudget) ? `$${fallbackExtractedBudget}` : fallbackExtractedBudget)
        : null;

      let finalEstimatedBudget = parsed.estimated_budget;
      if (!finalEstimatedBudget || finalEstimatedBudget.startsWith(',') || !/\d/.test(finalEstimatedBudget)) {
        finalEstimatedBudget = cleanedBudget || history?.previousBudget || null;
      }
      const finalBudgetMentioned = Boolean(parsed.budget_mentioned || finalEstimatedBudget || (rawBudgetMatch !== null));
      const resolvedProjectType = parsed.project_type || history?.previousProjectType || null;

      const validStages = ['discovery', 'needs_scope', 'needs_budget', 'confirmed', 'escorted'];
      const stage = validStages.includes(parsed.discovery_stage)
        ? (parsed.discovery_stage === 'needs_budget' && finalEstimatedBudget ? 'confirmed' : parsed.discovery_stage)
        : percentage >= 75
        ? 'escorted'
        : resolvedProjectType && finalBudgetMentioned
        ? 'confirmed'
        : resolvedProjectType
        ? 'needs_budget'
        : 'needs_scope';

      return {
        qualification_percentage: percentage,
        priority_tier: ['urgent', 'high', 'medium', 'low'].includes(parsed.priority_tier)
          ? parsed.priority_tier
          : percentage >= 75
          ? 'high'
          : percentage >= 50
          ? 'medium'
          : 'low',
        is_returning_client: Boolean(parsed.is_returning_client ?? isReturning),
        discovery_stage: stage,
        budget_mentioned: finalBudgetMentioned,
        estimated_budget: finalEstimatedBudget,
        project_type: resolvedProjectType,
        timeline: parsed.timeline || null,
        key_insights: parsed.key_insights || 'Inquiry processed.',
        suggested_reply:
          parsed.suggested_reply ||
          (isReturning
            ? `Welcome back to the studio! We'd love to discuss your new project. When is convenient for a quick consultation?`
            : `We would be glad to assist you with your project. To help guide you accurately, could you share a bit more about your scope and timeline?`),
      };
    }
  } catch (error) {
    console.error('Failed to qualify lead via Azure OpenAI (or timed out). Triggering Heuristic Fallback Scorer:', error);
  }

  return executeFallbackHeuristicScorer(message, history);
}
