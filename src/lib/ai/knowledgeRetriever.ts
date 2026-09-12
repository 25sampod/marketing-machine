import { supabaseAdmin } from '../supabase.ts';

export interface KnowledgeItem {
  id?: string;
  studio_id?: string;
  category: 'overview' | 'catalog' | 'pricing_delivery' | 'policies' | 'faq';
  title: string;
  content: string;
  tags: string[];
  is_active?: boolean;
}

const COMMON_STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'to', 'for', 'in', 'of', 'with', 'from',
  'i', 'me', 'my', 'you', 'your', 'we', 'our', 'want', 'like', 'need', 'can', 'please', 'make', 'do',
  'have', 'what', 'how', 'when', 'where', 'who', 'this', 'that', 'it', 'some', 'any', 'get'
]);
const TYPO_NORMALIZATIONS: Record<string, string> = {
  sampoo: 'shampoo',
  shampo: 'shampoo',
  sampo: 'shampoo',
  lipstic: 'lipstick',
  lipstik: 'lipstick',
  lipstics: 'lipstick',
  lipsticks: 'lipstick',
  fon: 'phone',
  mobail: 'mobile',
  cloth: 'clothing',
  clothe: 'clothes',
};

/**
 * Extracts meaningful keyword tokens from customer chat input
 */
export function extractSearchTokens(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const rawWords = clean
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !COMMON_STOP_WORDS.has(w));

  const tokens = new Set<string>();
  for (const w of rawWords) {
    tokens.add(w);
    if (TYPO_NORMALIZATIONS[w]) {
      tokens.add(TYPO_NORMALIZATIONS[w]);
    }
  }
  return Array.from(tokens);
}

/**
 * Automatically splits monolithic raw knowledge base text into structured knowledge items.
 * Understands markdown headings (--- SECTION --- or ## Heading) and categorizes intelligently.
 */
export function splitRawKnowledgeIntoItems(rawText: string): KnowledgeItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const sections: Array<{ header: string; lines: string[] }> = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip pure horizontal rule / banner dividers like ==== or ---- or ****
    if (/^[=\-_*#~]{3,}$/.test(trimmed)) {
      continue;
    }

    const isMajorHeader = 
      /^-{2,}\s*(.+?)\s*-{2,}$/.test(trimmed) || 
      /^#{1,6}\s*(.+)$/.test(trimmed) ||
      /^={2,}\s*(.+?)\s*={2,}$/.test(trimmed);

    if (isMajorHeader) {
      if (currentHeader && currentLines.length > 0) {
        sections.push({ header: currentHeader, lines: currentLines });
      }
      currentLines = [];
      const match = 
        trimmed.match(/^-{2,}\s*(.+?)\s*-{2,}$/) || 
        trimmed.match(/^#{1,6}\s*(.+)$/) ||
        trimmed.match(/^={2,}\s*(.+?)\s*={2,}$/);
      currentHeader = (match && match[1]) ? match[1].trim() : 'Section';
    } else {
      if (trimmed.length > 0) {
        currentLines.push(line);
      }
    }
  }

  if (currentHeader && currentLines.length > 0) {
    sections.push({ header: currentHeader, lines: currentLines });
  } else if (!currentHeader && currentLines.length > 0) {
    // If no headings existed at all, treat the entire text as Overview
    sections.push({ header: 'General Overview', lines: currentLines });
  }

  const items: KnowledgeItem[] = [];

  for (const sec of sections) {
    const content = sec.lines.join('\n').trim();
    if (!content || content.length < 5) continue;

    const lowerHeader = sec.header.toLowerCase();
    let category: KnowledgeItem['category'] = 'catalog';

    if (lowerHeader.includes('overview') || lowerHeader.includes('about') || lowerHeader.includes('company')) {
      category = 'overview';
    } else if (lowerHeader.includes('delivery') || lowerHeader.includes('pricing') || lowerHeader.includes('payment') || lowerHeader.includes('shipping') || lowerHeader.includes('fee')) {
      category = 'pricing_delivery';
    } else if (lowerHeader.includes('policy') || lowerHeader.includes('cancellation') || lowerHeader.includes('refund') || lowerHeader.includes('return') || lowerHeader.includes('terms') || lowerHeader.includes('warranty')) {
      category = 'policies';
    } else if (lowerHeader.includes('faq') || lowerHeader.includes('question') || lowerHeader.includes('how ordering works') || lowerHeader.includes('partner') || lowerHeader.includes('escalat') || lowerHeader.includes('rule') || lowerHeader.includes('contact')) {
      category = 'faq';
    } else {
      category = 'catalog';
    }

    // Auto-generate search tags from header words and common nouns
    const headerTokens = extractSearchTokens(sec.header);
    const contentTokens = extractSearchTokens(content).slice(0, 15);
    const tags = Array.from(new Set([...headerTokens, ...contentTokens])).slice(0, 12);

    items.push({
      category,
      title: sec.header,
      content,
      tags,
      is_active: true,
    });
  }

  return items;
}

/**
 * Reassembles structured modular knowledge items back into formatted markdown raw text.
 * Preserves standard section headers ('--- SECTION TITLE ---') so the process is 100% reversible.
 */
export function reassembleRawFromItems(
  items: Array<{ category?: string; title: string; content: string }>
): string {
  if (!items || items.length === 0) return '';

  const categoryOrder: Record<string, number> = {
    overview: 1,
    catalog: 2,
    pricing_delivery: 3,
    policies: 4,
    faq: 5,
  };

  const sorted = [...items].sort((a, b) => {
    const ca = categoryOrder[a.category || 'catalog'] || 99;
    const cb = categoryOrder[b.category || 'catalog'] || 99;
    return ca - cb;
  });

  return sorted
    .map(i => `--- ${i.title.trim().toUpperCase()} ---\n${i.content.trim()}`)
    .join('\n\n');
}

/**
 * Synchronizes raw text into modular knowledge items:
 * - Updates studio_settings.knowledge_base
 * - If raw text is empty / blank, deletes ALL modular cards for this studio (0 cards exist)
 * - If raw text has content, analyzes into modular sections, wipes old cards, and inserts new cards
 */
export async function syncRawKnowledgeToModular(
  studioId: string = 'default',
  rawText: string
): Promise<{ items: KnowledgeItem[]; rawText: string }> {
  const cleanRaw = (rawText || '').trim();

  // 1. Update studio_settings.knowledge_base
  await supabaseAdmin
    .from('studio_settings')
    .update({
      knowledge_base: cleanRaw,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studioId);

  // 2. If raw text is empty, wipe all modular cards for this studio
  if (!cleanRaw) {
    await supabaseAdmin
      .from('knowledge_items')
      .delete()
      .eq('studio_id', studioId);

    return { items: [], rawText: '' };
  }

  // 3. Analyze raw text into modular items
  const generated = splitRawKnowledgeIntoItems(cleanRaw);

  // 4. Wipe existing items for studio to maintain exact parity
  await supabaseAdmin
    .from('knowledge_items')
    .delete()
    .eq('studio_id', studioId);

  if (generated.length === 0) {
    return { items: [], rawText: cleanRaw };
  }

  // 5. Insert new modular cards
  const insertRows = generated.map(g => ({
    studio_id: studioId,
    category: g.category,
    title: g.title,
    content: g.content,
    tags: g.tags,
    is_active: true,
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('knowledge_items')
    .insert(insertRows)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return { items: (inserted as KnowledgeItem[]) || [], rawText: cleanRaw };
}

/**
 * Synchronizes modular knowledge items back into raw markdown:
 * - Reads all active/existing modular cards for the studio
 * - Reassembles into clean markdown
 * - Saves into studio_settings.knowledge_base
 */
export async function syncModularToRawKnowledge(
  studioId: string = 'default'
): Promise<string> {
  const { data: items } = await supabaseAdmin
    .from('knowledge_items')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: true });

  const rawText = reassembleRawFromItems(items || []);

  await supabaseAdmin
    .from('studio_settings')
    .update({
      knowledge_base: rawText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studioId);

  return rawText;
}

/**
 * Assembles a token-optimized knowledge block from modular items based on query relevance.
 * Enforces strict limits:
 * - When no specific intent matches (e.g. greetings like "hi"): returns ONLY the overview (~50 tokens), omitting bulky menus/policies.
 * - When items match: picks top 2 most relevant cards max.
 * - Content of each card is clamped to 350 chars max to prevent runaway context.
 */
export function assembleCuratedKnowledge(
  modularItems: KnowledgeItem[],
  userMessage: string
): string | null {
  if (!modularItems || modularItems.length === 0) return null;

  // 1. Core Overview item (concise baseline: ~40-60 tokens)
  const overviewItem = modularItems.find(i => i.category === 'overview') || modularItems[0];
  const otherItems = modularItems.filter(i => i.id ? i.id !== overviewItem.id : i !== overviewItem);

  const tokens = extractSearchTokens(userMessage);
  const lowerMsg = userMessage.toLowerCase();

  // 2. Score items based on query relevance
  const scored = otherItems.map(item => {
    let score = 0;
    const lowerTitle = item.title.toLowerCase();
    const lowerContent = item.content.toLowerCase();
    const tags = (item.tags || []).map((t: string) => t.toLowerCase());

    for (const tag of tags) {
      if (lowerMsg.includes(tag)) {
        score += 10;
      } else if (tokens.some(tok => tag.includes(tok) || tok.includes(tag))) {
        score += 5;
      }
    }

    for (const tok of tokens) {
      if (lowerTitle.includes(tok)) score += 6;
      if (lowerContent.includes(tok)) score += 2;
    }

    if (/\b(offer|offering|offerings|menu|food|item|items|catalog|product|products|service|services|dish|dishes|deal|deals|combo|combos|eat|order|buy|have|available|price|prices|rate|rates)\b/i.test(lowerMsg) && item.category === 'catalog') {
      score += 10;
    }
    if (/\b(deliver|delivery|address|fee|cost|area|zone|bkash|nagad|cash|cod|payment|pay)\b/i.test(lowerMsg) && item.category === 'pricing_delivery') {
      score += 8;
    }
    if (/\b(cancel|refund|return|wrong|missing|complaint)\b/i.test(lowerMsg) && item.category === 'policies') {
      score += 12;
    }
    if (/\b(how|faq|question|help|rider|partner|join)\b/i.test(lowerMsg) && item.category === 'faq') {
      score += 8;
    }

    return { item, score };
  });

  // Filter to positive matches and keep top 2 max to strictly minimize prompt tokens
  const matched = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(s => s.item);

  // If no specific inquiry matched (e.g. customer said "hi" or "hello"),
  // return ONLY the overview card. Do NOT inject bulky catalog/delivery items!
  const assembledBlocks: string[] = [];

  const clampContent = (text: string, maxLen = 350): string => {
    const trimmed = text.trim();
    return trimmed.length > maxLen ? trimmed.slice(0, maxLen).trim() + '...' : trimmed;
  };

  if (overviewItem) {
    assembledBlocks.push(`[${overviewItem.title.toUpperCase()}]\n${clampContent(overviewItem.content)}`);
  }

  for (const item of matched) {
    assembledBlocks.push(`[${item.title.toUpperCase()}]\n${clampContent(item.content)}`);
  }

  return assembledBlocks.join('\n\n') || null;
}

/**
 * Smart Selective Knowledge Retriever
 * Queries `knowledge_items` and builds a focused, token-optimized context block
 * containing ONLY the sections relevant to the customer's specific message.
 */
export async function retrieveRelevantKnowledge(
  userMessage: string,
  studioId: string = 'default'
): Promise<string | null> {
  try {
    // 1. Fetch active modular knowledge items for this studio (AI strictly reaches modular cards)
    const { data: modularItems, error } = await supabaseAdmin
      .from('knowledge_items')
      .select('*')
      .eq('studio_id', studioId)
      .eq('is_active', true);

    // 2. If modular items are empty or wiped, return null
    if (error || !modularItems || modularItems.length === 0) {
      return null;
    }

    // 3. Assemble curated, token-bounded context
    return assembleCuratedKnowledge(modularItems, userMessage);
  } catch (err) {
    console.error('[KnowledgeRetriever] Error retrieving modular knowledge:', err);
    return null;
  }
}
