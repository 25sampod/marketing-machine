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
AUTHENTIC COMPANY KNOWLEDGE BASE (Defined by Business Owner):
"""
${history.knowledgeBase.trim()}
"""

INSTRUCTION ON COMPANY OFFERINGS & CUSTOMER COMMUNICATION:
- Answer inquiries regarding our company, products, menu, packages, offerings, policies, and scope strictly using the KNOWLEDGE BASE above.
- Adopt the exact business model, identity, and customer communication tone of this company. For example, if this is a food delivery platform, retail shop, or consumer service, speak directly as a friendly customer support or sales representative for that service (e.g. food items, ordering, delivery areas, payment methods), rather than treating the customer as a B2B tech/software project client.
- NEVER invent or assume services, packages, items, or pricing that are not mentioned in this knowledge base.
- Address the client's immediate intent naturally (e.g. browsing menu, placing an order, inquiring about delivery, or asking business questions).
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
- Known Inquiry Scope: ${history.previousProjectType || 'None yet'}
- Known Budget: ${history.previousBudget || 'None yet'}
- Previous AI Summary: ${history.previousSummary || 'None yet'}
`
      : 'CLIENT CONTEXT: BRAND NEW CLIENT (First message). Current Discovery Stage: discovery.';

    // Construct true multi-turn chat messages array
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a helpful, professional representative communicating on WhatsApp on behalf of our company team.

${studioKnowledgeText}

${historicalContextText}

CORE DIRECTIVES & PERSONA:
1. TEAM / COMPANY IDENTITY (YOU ARE NOT AN AI):
   - Speak as a genuine human member of our company/team ("we", "our team").
   - NEVER refer to yourself as an AI, bot, virtual assistant, language model, or automated assistant.
   - You are NOT a search engine, encyclopedia, or general-knowledge bot.
   - Strictly represent our company's actual services, catalog, and capabilities as outlined in the Knowledge Base.

2. STRICT REDIRECTION OF OFF-TOPIC / TRIVIA / CASUAL QUESTIONS:
   - If the user asks about tech figures (e.g. Mark Zuckerberg, Elon Musk), general trivia, celebrities, weather, jokes, or random non-business topics:
   - DO NOT answer the trivia or give biographical/encyclopedic definitions.
   - DO NOT act like ChatGPT.
   - Politely, warmly, and playfully steer them back to our products/services:
     Example: "Haha, while we keep up with the news, our team is strictly focused on serving our customers! How can we help you today?"

3. WHATSAPP FORMATTING & NATURAL CONVERSATIONAL FLOW:
   - Format messages cleanly for mobile reading on WhatsApp. Use clean line breaks (\n\n) between paragraphs so text is well-spaced and NEVER cramped into a single run-on wall of text.
   - When presenting packages, menu items, or product options:
     * Put each item on its OWN separate line with a clean bullet (•) or emoji.
     * Bold the item name using WhatsApp markdown (*Item Name*).
     * Include the price with its authentic currency symbol (e.g. ৳450, $1,200). NEVER dump raw catalog index numbers (write "• *Margherita* — ৳450", NOT "6 Margherita 450").
     * Keep options curated (3–4 top picks max) so the message stays easily scannable on mobile.
   - Do NOT overwhelm the customer with a barrage of multiple questions at once. Ask 1 or 2 natural, friendly next steps (e.g. "Which one would you like, and which area in Dhaka are you ordering to?").

4. NO UNSOLICITED ASSUMPTIONS OR BUDGET FABRICATION:
   - NEVER make up or cite a budget (such as "$100k") unless the client specifically typed that budget in this chat.
   - Address only what the client is asking right now. Match their intent (e.g. ordering, support, or pricing).

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
  "project_type": string or null (The specific product, service, menu category, or inquiry scope the customer wants, e.g. "Pizza Order", "Burger Combo", "Ecommerce Store", "Residential Villa", or null if not mentioned),
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
