import OpenAI from 'openai';
import { executeFallbackHeuristicScorer } from './fallbackScorer.ts';
import { getStudioSettings } from '../settings.ts';
import { createAiClient, StudioSettingsCredentials } from '../settingsResolver.ts';

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
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface QualifyLeadOptions {
  signal?: AbortSignal;
}

export async function qualifyLeadMessage(
  message: string,
  history?: HistoricalContext,
  options?: QualifyLeadOptions
): Promise<QualificationResult> {
  if (options?.signal?.aborted) {
    const abortErr = new Error('Lead qualification preempted');
    abortErr.name = 'AbortError';
    throw abortErr;
  }

  const isReturning = Boolean(history?.isReturningClient);

  const settings = await getStudioSettings();
  const aiSetup = createAiClient(settings);

  if (!aiSetup) {
    console.warn('No AI API Key found in Studio Settings or environment, using fallback heuristic scorer.');
    return executeFallbackHeuristicScorer(message, history);
  }

  try {
    const studioKnowledgeText = history?.knowledgeBase?.trim()
      ? `COMPANY KNOWLEDGE:\n${history.knowledgeBase.trim()}`
      : 'COMPANY KNOWLEDGE:\nNo specific catalog provided. Adhere strictly to verified company services.';

    const historicalContextText = history
      ? `CLIENT: ${isReturning ? 'Returning' : 'New'} | Stage: ${history.currentStage || 'discovery'}${history.previousBudget ? ` | Confirmed Budget: ${history.previousBudget}` : ''}`
      : 'CLIENT: New | Stage: discovery';

    // Construct true multi-turn chat messages array
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You represent our company team on WhatsApp ("we"). Authentic, helpful & human.

${studioKnowledgeText}

${historicalContextText}

DIRECTIVES:
1. Speak as team member ("we"). NEVER claim to be AI/bot.
2. STRICT KNOWLEDGE ANCHOR: Answer inquiries strictly and exclusively using COMPANY KNOWLEDGE.
   - If past messages in the conversation mention past topics, services, or industries (such as web development, design, software, or external services) that are NOT in current COMPANY KNOWLEDGE, IGNORE THEM COMPLETELY. Never continue discussing unlisted services under any circumstances.
   - When customer asks "what do you offer", "menu", or general questions, showcase 2-4 representative items with prices (*Item* — Price) from COMPANY KNOWLEDGE across available categories. Never invent unlisted products or pricing.
3. If off-topic/trivia (e.g. celebrities, tech figures, weather), warmly deflect back to our services.
4. Format for WhatsApp: clean line breaks, bold items (*Item* — Price), max 3-4 options, ask 1 clear next step.
5. If customer inquiry/scope is known, score 80-95%. Never invent a budget unless customer stated one.
6. If customer cancels or declines (e.g. "not interested", "cancel", "stop", "nevermind"), set discovery_stage="lost", qualification_percentage=0, priority_tier="low".
7. In key_insights, write a concise 1-sentence summary of the client's current inquiry, intent, and status for the team dashboard.

JSON schema:
{"qualification_percentage":number,"priority_tier":"urgent"|"high"|"medium"|"low","is_returning_client":boolean,"discovery_stage":"discovery"|"needs_scope"|"needs_budget"|"confirmed"|"escorted"|"lost","budget_mentioned":boolean,"estimated_budget":string|null,"project_type":string|null,"timeline":string|null,"key_insights":string,"suggested_reply":string}`,
      },
    ];

    // Append previous messages from history to provide true multi-turn conversational context
    // Pruned to last 4 messages (2 user + 2 assistant turns) to preserve context while saving tokens
    let priorMessages = (history?.recentMessages || []).slice(-4);
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

    const modelName = aiSetup.modelName;
    const isReasoningModel = /^(o1|o3|gpt-5)/i.test(modelName);

    // Uncapped completion tokens & unlimited execution time:
    // Model is allowed full natural reasoning and generation budget without artificial token caps or abort timeouts.
    // Token optimization is focused strictly on input tokens (selective knowledge + history pruning) without losing quality.
    const requestPayload: any = {
      model: modelName,
      messages: chatMessages,
      response_format: { type: 'json_object' },
    };

    if (isReasoningModel) {
      requestPayload.reasoning_effort = 'low';
    }

    const clientOptions = options?.signal ? { signal: options.signal } : undefined;
    const response = await (aiSetup.client.chat.completions.create as any)(requestPayload, clientOptions);

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

      const usage = response?.usage
        ? {
            prompt_tokens: response.usage.prompt_tokens ?? 0,
            completion_tokens: response.usage.completion_tokens ?? 0,
            total_tokens: response.usage.total_tokens ?? 0,
          }
        : undefined;

      if (usage) {
        console.log(`[AI Token Consumption] Prompt: ${usage.prompt_tokens} | Completion: ${usage.completion_tokens} | Total: ${usage.total_tokens} (Model: ${aiSetup.modelName})`);
      }

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
            ? `Hello! Great to hear from you again. How can our team help you today?`
            : `Hello! Thanks for reaching out. How can our team assist you today?`),
        token_usage: usage,
      };
    }
  } catch (error: any) {
    if (
      options?.signal?.aborted ||
      error?.name === 'AbortError' ||
      error?.name === 'APIUserAbortError' ||
      error?.message?.includes('aborted')
    ) {
      throw error;
    }
    console.error('Failed to qualify lead via Azure OpenAI (or timed out). Triggering Heuristic Fallback Scorer:', error);
  }

  return executeFallbackHeuristicScorer(message, history);
}
