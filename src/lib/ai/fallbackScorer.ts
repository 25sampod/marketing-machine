import type { HistoricalContext, QualificationResult } from './qualifyLead';

export interface HeuristicParseDetails {
  detectedBudget: string | null;
  budgetMentioned: boolean;
  detectedProjectType: string | null;
  detectedTimeline: string | null;
  timelineUrgency: 'urgent' | 'medium' | 'low' | 'none';
  qualificationPercentage: number;
  priorityTier: 'urgent' | 'high' | 'medium' | 'low';
  discoveryStage: 'discovery' | 'needs_scope' | 'needs_budget' | 'confirmed' | 'escorted' | 'lost';
  keyInsights: string;
  suggestedReply: string;
}

/**
 * Parses budget mentions from raw text, supporting formats like:
 * "$150k", "$150,000", "100,000", "50k", "$2.5m", "100k usd", "budget is 20000"
 */
export function parseBudgetMention(text: string): { budget: string | null; mentioned: boolean; rawAmount: number | null } {
  if (!text) return { budget: null, mentioned: false, rawAmount: null };

  const clean = text.trim();

  // 1. Explicit currency symbol with amount: e.g. $150k, $150,000, $2.5M, $1.5B, €50,000, £100k
  const currencyMatch = clean.match(/(?:[\$€£]|usd\s*)\s*([\d,.]+(?:\s*(?:k|kilo|thousand|million|m|billion|b))?)\b/i);
  if (currencyMatch && currencyMatch[1]) {
    const rawVal = currencyMatch[1].trim();
    return {
      budget: `$${rawVal.toUpperCase()}`,
      mentioned: true,
      rawAmount: normalizeAmount(rawVal),
    };
  }

  // 2. Keyword "budget / cost / price / investment" followed by amount: e.g. "budget is 100,000", "budget 150k", "budget 2 billion"
  const keywordMatch = clean.match(
    /\b(?:budget|cost|price|investment|quote|funds?)(?:\s*(?:is|of|around|approx|approximately|about|close to|:|=))?\s*[\$€£]?\s*([\d,.]+(?:\s*(?:k|kilo|thousand|million|m|billion|b|usd|dollars))?)\b/i
  );
  if (keywordMatch && keywordMatch[1] && /\d/.test(keywordMatch[1])) {
    const rawVal = keywordMatch[1].replace(/usd|dollars/gi, '').trim();
    return {
      budget: `$${rawVal.toUpperCase()}`,
      mentioned: true,
      rawAmount: normalizeAmount(rawVal),
    };
  }

  // 3. Amount followed by unit: e.g. "150k", "100k", "500k", "2.5m", "1.5b", "100,000 usd"
  const unitMatch = clean.match(/\b(\d+[\d,.]*)\s*(k|kilo|thousand|million|m|billion|b|usd|dollars)\b/i);
  if (unitMatch && unitMatch[1]) {
    const num = unitMatch[1].trim();
    const unit = unitMatch[2].toLowerCase();
    const formatted = unit.startsWith('b') ? `${num}B` : unit.startsWith('m') ? `${num}M` : unit.startsWith('k') ? `${num}K` : num;
    return {
      budget: `$${formatted}`,
      mentioned: true,
      rawAmount: normalizeAmount(`${num}${unit}`),
    };
  }

  // 4. Standalone large numbers indicative of budget: e.g. "100,000", "150000", "50,000"
  const largeNumberMatch = clean.match(/\b(\d{2,3}[,]\d{3}|\d{5,8})\b/);
  if (largeNumberMatch && largeNumberMatch[1]) {
    const rawVal = largeNumberMatch[1].trim();
    return {
      budget: `$${rawVal}`,
      mentioned: true,
      rawAmount: normalizeAmount(rawVal),
    };
  }

  // 5. Generic budget indication without exact number
  const genericBudget = /\b(budget|affordable|expensive|pricing|quote|cost)\b/i.test(clean);
  return {
    budget: null,
    mentioned: genericBudget,
    rawAmount: null,
  };
}

function normalizeAmount(val: string): number | null {
  try {
    const lower = val.toLowerCase().replace(/,/g, '');
    if (lower.includes('b') || /billion/i.test(val)) {
      const cleanNum = lower.replace(/[^\d.]/g, '');
      return parseFloat(cleanNum) * 1_000_000_000;
    }
    if (lower.includes('m') || /million/i.test(val)) {
      const cleanNum = lower.replace(/[^\d.]/g, '');
      return parseFloat(cleanNum) * 1_000_000;
    }
    if (lower.includes('k') || /kilo|thousand/i.test(val)) {
      const cleanNum = lower.replace(/[^\d.]/g, '');
      return parseFloat(cleanNum) * 1_000;
    }
    const cleanNum = lower.replace(/[^\d.]/g, '');
    const num = parseFloat(cleanNum);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

/**
 * Parses project typology & scope keywords from message
 */
export function parseScopeKeywords(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Web & Digital Platform
  if (/\b(website|web app|web development|landing page|ecommerce|e-commerce|software|saas|platform|mobile app|marketing machine|branding)\b/i.test(lower)) {
    return 'Web & Digital Platform';
  }

  // Master Planning
  if (/\b(master planning|urban planning|landscape|site development|zoning)\b/i.test(lower)) {
    return 'Master Planning';
  }

  // Renovation & Fit-out (prioritized before generic residential/commercial shells)
  if (/\b(renovation|remodel|interior|fitout|fit-out|refurbishment|restoration|redesign|remodeling)\b/i.test(lower)) {
    return 'Interior & Renovation';
  }

  // Commercial
  if (/\b(commercial|office|retail|restaurant|hospitality|hotel|store|warehouse|corporate|showroom|headquarters|coworking)\b/i.test(lower)) {
    return 'Commercial Architecture';
  }

  // Residential
  if (/\b(residential|villa|house|home|apartment|condo|penthouse|residence|duplex|townhouse|estate)\b/i.test(lower)) {
    return 'Residential Architecture';
  }

  // General Architecture / Building Design
  if (/\b(architect|architecture|architectural|building design|blueprints?|floor plan)\b/i.test(lower)) {
    return 'Architectural Design';
  }

  // Food & Dining / On-demand Orders
  if (/\b(pizza|burger|biryani|tehari|khichuri|kacchi|chowmein|fried chicken|food order|order food|meal|dessert|drinks)\b/i.test(lower)) {
    const matched = lower.match(/\b(pizza|burger|biryani|tehari|kacchi|chowmein|fried chicken|food order)\b/i);
    const label = matched ? matched[0].charAt(0).toUpperCase() + matched[0].slice(1) : 'Food';
    return `${label} Order`;
  }

  return null;
}

/**
 * Parses timeline urgency keywords from message
 */
export function parseTimelineUrgency(text: string): { timeline: string | null; urgency: 'urgent' | 'medium' | 'low' | 'none' } {
  if (!text) return { timeline: null, urgency: 'none' };
  const lower = text.toLowerCase();

  // Urgent / High urgency
  if (/\b(asap|immediate|immediately|urgent|urgently|today|tomorrow|24 hours?|48 hours?|right now|this week|next week|in 1 week|in 2 weeks|right away|rush|emergency|by friday|make a.*order|place a.*order|order now)\b/i.test(lower)) {
    return { timeline: 'Immediate / ASAP (High Urgency)', urgency: 'urgent' };
  }

  // Medium urgency
  if (/\b(month|this month|next month|1 month|2 months|3 months|q1|q2|q3|q4|soon|few weeks|in a few weeks|this quarter)\b/i.test(lower)) {
    return { timeline: '1 - 3 Months', urgency: 'medium' };
  }

  // Low urgency / flexible
  if (/\b(flexible|no rush|next year|exploring|planning ahead|sometime|in future|long term)\b/i.test(lower)) {
    return { timeline: 'Flexible / Long Term', urgency: 'low' };
  }

  return { timeline: null, urgency: 'none' };
}

/**
 * Detects if a client explicitly declined to proceed, cancelled, opted out, or expressed disinterest.
 * Examples: "dont want any", "dont want that anymore", "not interested", "stop", "cancel", "no thanks"
 */
export function isClientDecliningOrOptingOut(text: string): boolean {
  if (!text) return false;
  const clean = text.toLowerCase().trim();
  return (
    /\b(dont want|don't want|do not want|not interested|no longer interested|cancel|stop|quit|unsubscribe|optout|opt-out|no thanks|no thank you|nevermind|never mind|pass on this|changed my mind|wont proceed|won't proceed|will not proceed|not to proceed|decided not to|not pursuing|not looking anymore|dont need|don't need|do not need|close this|forget it)\b/i.test(clean) ||
    /^(no|nope|nah)\s*$/i.test(clean)
  );
}

/**
 * Fallback Heuristic Scorer
 * Executes instantly when Azure OpenAI call fails, times out, or returns invalid structure.
 * Guarantees no lead is ever dropped or un-scored.
 */
export function executeFallbackHeuristicScorer(
  messageText: string,
  history?: HistoricalContext,
  existingLead?: any
): QualificationResult {
  const isReturning = Boolean(history?.isReturningClient || existingLead?.is_returning_client);

  // Check if client explicitly declined or opted out
  if (isClientDecliningOrOptingOut(messageText)) {
    return {
      qualification_percentage: 0,
      priority_tier: 'low',
      is_returning_client: isReturning,
      discovery_stage: 'lost',
      budget_mentioned: false,
      estimated_budget: existingLead?.estimated_budget || null,
      project_type: existingLead?.project_type || null,
      timeline: null,
      key_insights: 'Client explicitly stated they do not wish to proceed with this commission.',
      suggested_reply: 'Understood completely! Thank you for letting us know. If your plans change in the future, our team will be here to help.',
    };
  }

  // 1. Budget extraction
  const budgetResult = parseBudgetMention(messageText);
  const detectedBudget = budgetResult.budget || history?.previousBudget || existingLead?.estimated_budget || null;
  const budgetMentioned = budgetResult.mentioned || Boolean(detectedBudget) || Boolean(existingLead?.budget_mentioned);

  // 2. Scope extraction
  const detectedScope = parseScopeKeywords(messageText) || history?.previousProjectType || existingLead?.project_type || null;

  // 3. Timeline extraction
  const timelineResult = parseTimelineUrgency(messageText);
  const detectedTimeline = timelineResult.timeline || existingLead?.timeline || null;
  const effectiveUrgency =
    timelineResult.urgency !== 'none'
      ? timelineResult.urgency
      : parseTimelineUrgency(detectedTimeline || '').urgency;

  // 4. Qualification percentage calculation
  // Evaluates Project Scope Fit & Genuine Client Intent (Domain Relevance).
  // Budget is tracked and scored separately under Budget Depth, so an inquiry with a clear scope
  // and serious intent is not double-penalized simply for not stating a dollar figure upfront.
  let percentage = 35; // baseline serious inquiry
  if (detectedScope) percentage += 45; // clear project scope match
  if (effectiveUrgency === 'urgent') percentage += 15;
  else if (effectiveUrgency === 'medium') percentage += 10;
  if (detectedBudget) percentage += 5; // confirmation bonus
  if (isReturning) percentage += 10;
  percentage = Math.min(100, Math.max(20, percentage));

  // 5. Discovery Stage
  let stage: 'discovery' | 'needs_scope' | 'needs_budget' | 'confirmed' | 'escorted' | 'lost' = 'discovery';
  if (detectedScope && detectedBudget) {
    stage = percentage >= 75 ? 'escorted' : 'confirmed';
  } else if (detectedScope && !detectedBudget) {
    stage = 'needs_budget';
  } else if (!detectedScope && (detectedBudget || budgetMentioned)) {
    stage = 'needs_scope';
  } else {
    stage = 'discovery';
  }

  // 6. Priority Tier
  const priorityTier: 'urgent' | 'high' | 'medium' | 'low' =
    percentage >= 80 || (detectedBudget && effectiveUrgency === 'urgent')
      ? 'urgent'
      : percentage >= 60 || detectedBudget
      ? 'high'
      : percentage >= 40 || detectedScope
      ? 'medium'
      : 'low';

  // 7. Human-like suggested reply tailored to heuristics
  let suggestedReply: string;
  if (isReturning) {
    suggestedReply = detectedScope
      ? `Welcome back to our studio! We'd be thrilled to assist with your new ${detectedScope} project. When is convenient for a quick kickoff call?`
      : `Welcome back to our studio! What new project can our team help you bring to life?`;
  } else if (stage === 'escorted' || stage === 'confirmed') {
    suggestedReply = `Thank you for the project overview! With your ${detectedScope || 'project'} scope and estimated investment of ${detectedBudget || 'the outlined range'}, our senior team would love to schedule an initial concept consultation. Would later this week work for you?`;
  } else if (stage === 'needs_budget') {
    suggestedReply = `Thank you for reaching out regarding your ${detectedScope}! To help our team advise on the right scope and timeline, what estimated budget or investment range are you aiming for?`;
  } else if (stage === 'needs_scope') {
    suggestedReply = `Thanks for reaching out! With an investment range around ${detectedBudget}, our team can create a tailored design solution. Could you share a few details about your property or project requirements?`;
  } else {
    suggestedReply = `Thank you for contacting our studio! Could you share a few details regarding your project scope and target timeline so our specialists can guide you?`;
  }

  const keyInsights = `[Heuristic Fallback] Inquiry received: ${detectedScope || 'General Studio Inquiry'}${detectedBudget ? ` · Budget: ${detectedBudget}` : ''}${detectedTimeline ? ` · Timeline: ${detectedTimeline}` : ''}.`;

  return {
    qualification_percentage: percentage,
    priority_tier: priorityTier,
    is_returning_client: isReturning,
    discovery_stage: stage,
    budget_mentioned: budgetMentioned,
    estimated_budget: detectedBudget,
    project_type: detectedScope,
    timeline: detectedTimeline,
    key_insights: keyInsights,
    suggested_reply: suggestedReply,
  };
}
