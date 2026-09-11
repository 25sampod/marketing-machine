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

/**
 * Extracts meaningful keyword tokens from customer chat input
 */
export function extractSearchTokens(text: string): string[] {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return clean
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !COMMON_STOP_WORDS.has(w));
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
    } else if (lowerHeader.includes('delivery') || lowerHeader.includes('pricing') || lowerHeader.includes('payment') || lowerHeader.includes('shipping')) {
      category = 'pricing_delivery';
    } else if (lowerHeader.includes('policy') || lowerHeader.includes('cancellation') || lowerHeader.includes('refund') || lowerHeader.includes('terms')) {
      category = 'policies';
    } else if (lowerHeader.includes('faq') || lowerHeader.includes('question') || lowerHeader.includes('how ordering works') || lowerHeader.includes('partner')) {
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
 * Smart Selective Knowledge Retriever
 * Queries `knowledge_items` and builds a focused, token-optimized context block
 * containing ONLY the sections relevant to the customer's specific message.
 */
export async function retrieveRelevantKnowledge(
  userMessage: string,
  studioId: string = 'default'
): Promise<string | null> {
  const { supabaseAdmin } = await import('../supabase.ts');
  try {
    // 1. Fetch active modular knowledge items for this studio
    const { data: modularItems, error } = await supabaseAdmin
      .from('knowledge_items')
      .select('*')
      .eq('studio_id', studioId)
      .eq('is_active', true);

    // 2. Fallback to studio_settings.knowledge_base if modular table has no records
    if (error || !modularItems || modularItems.length === 0) {
      const { data: settings } = await supabaseAdmin
        .from('studio_settings')
        .select('knowledge_base')
        .eq('id', studioId)
        .maybeSingle();
      return settings?.knowledge_base || null;
    }

    // 3. Always include the Core Company Overview (tiny: ~40-60 tokens)
    const overviewItem = modularItems.find(i => i.category === 'overview') || modularItems[0];
    const otherItems = modularItems.filter(i => i.id !== overviewItem.id);

    const tokens = extractSearchTokens(userMessage);
    const lowerMsg = userMessage.toLowerCase();

    // 4. Score other items based on relevance to the customer's message
    const scored = otherItems.map(item => {
      let score = 0;
      const lowerTitle = item.title.toLowerCase();
      const lowerContent = item.content.toLowerCase();
      const tags = (item.tags || []).map((t: string) => t.toLowerCase());

      // Direct tag match (highest weight)
      for (const tag of tags) {
        if (lowerMsg.includes(tag)) {
          score += 10;
        } else if (tokens.some(tok => tag.includes(tok) || tok.includes(tag))) {
          score += 5;
        }
      }

      // Title match
      for (const tok of tokens) {
        if (lowerTitle.includes(tok)) {
          score += 6;
        }
        if (lowerContent.includes(tok)) {
          score += 2;
        }
      }

      // Contextual boosts
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

    // Filter to items with positive relevance score, sort descending
    let matched = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.item);

    // If message is generic (e.g. "hi", "what do you offer?"), supply overview + 1 top catalog/delivery summary
    if (matched.length === 0) {
      const topCatalog = otherItems.find(i => i.category === 'catalog');
      const topDelivery = otherItems.find(i => i.category === 'pricing_delivery');
      matched = [topCatalog, topDelivery].filter(Boolean) as KnowledgeItem[];
    } else {
      // Limit to top 2-3 most relevant items to strictly prevent token bloat
      matched = matched.slice(0, 3);
    }

    // 5. Assemble curated context block
    const assembledBlocks: string[] = [];
    if (overviewItem) {
      assembledBlocks.push(`[SECTION: ${overviewItem.title.toUpperCase()}]\n${overviewItem.content}`);
    }
    for (const item of matched) {
      assembledBlocks.push(`[SECTION: ${item.title.toUpperCase()}]\n${item.content}`);
    }

    return assembledBlocks.join('\n\n');
  } catch (err) {
    console.error('[KnowledgeRetriever] Error retrieving modular knowledge, falling back:', err);
    // Graceful fallback to studio_settings
    const { data: settings } = await supabaseAdmin
      .from('studio_settings')
      .select('knowledge_base')
      .eq('id', studioId)
      .maybeSingle();
    return settings?.knowledge_base || null;
  }
}
