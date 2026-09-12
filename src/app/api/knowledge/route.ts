import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  splitRawKnowledgeIntoItems, 
  syncRawKnowledgeToModular, 
  syncModularToRawKnowledge 
} from '@/lib/ai/knowledgeRetriever';

// GET - List all modular knowledge items for the studio
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studioId = searchParams.get('studioId') || 'default';
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('knowledge_items')
      .select('*')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: true });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: items || [] });
  } catch (err: any) {
    console.error('[API /api/knowledge GET Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to fetch knowledge items' }, { status: 500 });
  }
}

// POST - Create a new item OR bidirectional sync from raw text
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const studioId = body.studioId || 'default';

    // Raw -> Modular Sync Action (or auto-split)
    if (body.action === 'sync_from_raw' || body.action === 'split_from_raw' || body.splitFromRaw) {
      let rawText = body.rawText;
      if (rawText === undefined) {
        const { data: settings } = await supabaseAdmin
          .from('studio_settings')
          .select('knowledge_base')
          .eq('id', studioId)
          .maybeSingle();
        rawText = settings?.knowledge_base || '';
      }

      // If raw text is empty/blank, syncRawKnowledgeToModular will clear studio_settings.knowledge_base
      // and delete ALL modular cards for this studio (0 cards exist).
      const result = await syncRawKnowledgeToModular(studioId, rawText);

      return NextResponse.json({
        success: true,
        message: result.items.length === 0
          ? 'Knowledge base cleared. All modular cards removed.'
          : `Successfully synchronized ${result.items.length} modular knowledge sections!`,
        items: result.items,
        rawText: result.rawText,
      });
    }

    // Single item creation
    const { category, title, content, tags, is_active } = body;
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const cleanCategory = ['overview', 'catalog', 'pricing_delivery', 'policies', 'faq'].includes(category)
      ? category
      : 'catalog';

    const cleanTags = Array.isArray(tags) 
      ? tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean)
      : typeof tags === 'string'
      ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
      : [];

    const { data: newItem, error: createErr } = await supabaseAdmin
      .from('knowledge_items')
      .insert({
        studio_id: studioId,
        category: cleanCategory,
        title: title.trim(),
        content: content.trim(),
        tags: cleanTags,
        is_active: is_active !== false,
      })
      .select('*')
      .single();

    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }

    // Modular -> Raw Sync: Reassemble markdown and update studio_settings.knowledge_base
    const rawText = await syncModularToRawKnowledge(studioId);

    return NextResponse.json({ success: true, item: newItem, rawText });
  } catch (err: any) {
    console.error('[API /api/knowledge POST Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create knowledge item' }, { status: 500 });
  }
}

// PUT - Update an existing item
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, content, category, tags, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (content !== undefined) updates.content = content.trim();
    if (category && ['overview', 'catalog', 'pricing_delivery', 'policies', 'faq'].includes(category)) {
      updates.category = category;
    }
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags)
        ? tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean)
        : typeof tags === 'string'
        ? tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
        : [];
    }
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data: updated, error } = await supabaseAdmin
      .from('knowledge_items')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Modular -> Raw Sync: Reassemble markdown and update studio_settings.knowledge_base
    const studioId = body.studioId || updated.studio_id || 'default';
    const rawText = await syncModularToRawKnowledge(studioId);

    return NextResponse.json({ success: true, item: updated, rawText });
  } catch (err: any) {
    console.error('[API /api/knowledge PUT Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update knowledge item' }, { status: 500 });
  }
}

// DELETE - Delete an item by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    const { data: itemToDelete } = await supabaseAdmin
      .from('knowledge_items')
      .select('studio_id')
      .eq('id', id)
      .maybeSingle();

    const studioId = itemToDelete?.studio_id || searchParams.get('studioId') || 'default';

    const { error } = await supabaseAdmin
      .from('knowledge_items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Modular -> Raw Sync: Reassemble markdown and update studio_settings.knowledge_base
    const rawText = await syncModularToRawKnowledge(studioId);

    return NextResponse.json({ success: true, message: 'Item deleted successfully', rawText });
  } catch (err: any) {
    console.error('[API /api/knowledge DELETE Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to delete knowledge item' }, { status: 500 });
  }
}
