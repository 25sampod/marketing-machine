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
  isReturningClient?: boolean;
  currentStage?: string | null;
}

export interface QualificationResult {
  qualification_percentage: number; // 0 - 100
  priority_tier: 'urgent' | 'high' | 'medium' | 'low';
  is_returning_client: boolean;
  discovery_stage: 'discovery' | 'needs_scope' | 'needs_budget' | 'confirmed' | 'escorted';
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
    const percentage = fallbackBudgetMentioned && fallbackProjectType ? 85 : fallbackProjectType ? 55 : 25;
    const stage = fallbackBudgetMentioned && fallbackProjectType ? 'confirmed' : fallbackProjectType ? 'needs_budget' : 'needs_scope';
    return {
      qualification_percentage: percentage,
      priority_tier: percentage >= 75 ? 'high' : percentage >= 50 ? 'medium' : 'low',
      is_returning_client: isReturning,
      discovery_stage: stage,
      budget_mentioned: fallbackBudgetMentioned,
      estimated_budget: fallbackBudgetMentioned ? 'Mentioned in text' : null,
      project_type: fallbackProjectType,
      timeline: 'Not specified',
      key_insights: `Lead inquired regarding ${fallbackProjectType || 'architectural services'}.`,
      suggested_reply: isReturning
        ? `Welcome back to ArchScale! We'd love to assist with your new ${fallbackProjectType || 'project'}. When is a good time for a quick catch-up call?`
        : `Thanks for contacting ArchScale! To help our architects guide you, could you share a bit about your project type and estimated budget?`,
    };
  }

  try {
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
        content: `You are a senior team consultant at "ArchScale & Marketing Machine", a premier digital product, web design, and architecture studio. You communicate with prospective clients on WhatsApp on behalf of our studio team.

${historicalContextText}

CORE DIRECTIVES & PERSONA:
1. TEAM / COMPANY IDENTITY (YOU ARE NOT AN AI):
   - Speak as a real member of our studio team ("we", "our team", "our studio").
   - NEVER refer to yourself as an AI, bot, virtual assistant, language model, or automated assistant.
   - You are NOT a search engine, encyclopedia, or general-knowledge bot.

2. STRICT REDIRECTION OF OFF-TOPIC / TRIVIA / CASUAL QUESTIONS:
   - If the user asks about tech figures (e.g. Mark Zuckerberg, Elon Musk), general trivia, celebrities, weather, jokes, or random non-business topics:
   - DO NOT answer the trivia or give biographical/encyclopedic definitions.
   - DO NOT act like ChatGPT.
   - Politely, warmly, and playfully steer them back to our studio's products and services:
     Example: "Haha, while we keep up with tech news, our team is strictly focused on building high-performance websites and products for businesses! Let's talk about your project—what kind of site or feature are you looking to launch?"
     Example: "We're a design and digital product studio, so we spend our days crafting websites and marketing engines rather than tech trivia! What does your business need built?"

3. CONCISE, PUNCHY & TOKEN-EFFICIENT (WHATSAPP SIZED):
   - Keep suggested replies BRIEF, CRISP, and TO THE POINT (strict limit: 35–60 words, 2–3 short sentences maximum).
   - Avoid walls of text, long disclaimers, or exhaustive feature lists.
   - For website package inquiries: provide an ultra-compact summary:
     • Starter (1–3 pages): quick, mobile-ready site.
     • Growth (5–10 pages): SEO & lead capture.
     • Pro/Store: custom ecommerce & integrations.
     Followed by: "Which tier best matches what you're looking to launch?"
   - NEVER repeat what you already explained in previous messages. If packages were already sent earlier in the chat, DO NOT re-list them.

4. NO UNSOLICITED ASSUMPTIONS OR BUDGET FABRICATION:
   - NEVER make up or cite a budget (such as "$100k") unless the client specifically typed that budget in this chat.
   - Address only what the client is asking right now.

5. NATURAL CONVERSATION FLOW:
   - If there is prior message history, NEVER repeat greeting lines ("Hello", "Thanks for reaching out"). Jump directly into the answer.
   - When project scope and budget are both confirmed:
     - Set "discovery_stage" to "escorted" and "qualification_percentage" >= 75.
     - Inform them succinctly that our team will be in touch to schedule their kickoff consultation.

Respond ONLY in valid JSON matching this schema:
{
  "qualification_percentage": number (0-100),
  "priority_tier": "urgent" | "high" | "medium" | "low",
  "is_returning_client": boolean,
  "discovery_stage": "discovery" | "needs_scope" | "needs_budget" | "confirmed" | "escorted",
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

    const response = await openai.chat.completions.create({
      model: useAzure ? process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5-nano' : 'gpt-4o',
      messages: chatMessages,
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const content = response.choices[0].message.content;
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
      const finalBudgetMentioned = Boolean(parsed.budget_mentioned || finalEstimatedBudget || fallbackBudgetMentioned);
      const resolvedProjectType = parsed.project_type || history?.previousProjectType || fallbackProjectType;

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
    console.error('Failed to qualify lead via Azure OpenAI:', error);
  }

  return {
    qualification_percentage: fallbackBudgetMentioned && fallbackProjectType ? 75 : 35,
    priority_tier: fallbackBudgetMentioned && fallbackProjectType ? 'high' : 'low',
    is_returning_client: isReturning,
    discovery_stage: fallbackBudgetMentioned && fallbackProjectType ? 'confirmed' : 'needs_budget',
    budget_mentioned: fallbackBudgetMentioned,
    estimated_budget: null,
    project_type: fallbackProjectType,
    timeline: null,
    key_insights: 'Inquiry received via WhatsApp.',
    suggested_reply: isReturning
      ? 'Welcome back! When would you like to discuss your new project?'
      : 'Glad to connect! Could you share a few details on what you are looking to achieve?',
  };
}
