-- ==============================================================================
-- Migration 00008: Modular Knowledge Base Architecture
-- 
-- Creates `public.knowledge_items` to store categorized, tag-indexed knowledge chunks
-- for Smart Selective Retrieval (RAG-lite), reducing prompt token usage by 75-85%.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id TEXT NOT NULL DEFAULT 'default',
  category TEXT NOT NULL CHECK (category IN ('overview', 'catalog', 'pricing_delivery', 'policies', 'faq')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_studio_category_active 
  ON public.knowledge_items(studio_id, category, is_active);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_tags 
  ON public.knowledge_items USING GIN(tags);

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_items' AND policyname = 'Allow all access to knowledge_items'
  ) THEN
    CREATE POLICY "Allow all access to knowledge_items" ON public.knowledge_items
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
