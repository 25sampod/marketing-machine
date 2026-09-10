-- ==============================================================================
-- Migration 00005: WhatsApp Lead Pipeline v2 System Design Upgrades
-- 
-- 1. Updates `public.leads.status` check constraint to support Kanban stages:
--    ('new', 'contacted', 'qualified', 'consultation_booked', 'converted', 'lost', 'dead')
-- 2. Creates `public.lpi_history` table for score audit trails and dynamic re-scoring history.
-- 3. Adds `whatsapp_message_id` to `public.messages` for webhook deduplication.
-- ==============================================================================

-- 1. Update status check constraint on leads table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' 
      AND t.relname = 'leads' 
      AND c.contype = 'c' 
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.leads DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
  
  ALTER TABLE public.leads 
    ADD CONSTRAINT leads_status_check 
    CHECK (status IN ('new', 'contacted', 'qualified', 'consultation_booked', 'converted', 'lost', 'dead'));
END $$;

-- 2. Add whatsapp_message_id to messages table for webhook deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'whatsapp_message_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN whatsapp_message_id TEXT;
    CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON public.messages(whatsapp_message_id);
  END IF;
END $$;

-- 3. Create public.lpi_history table
CREATE TABLE IF NOT EXISTS public.lpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  previous_score INTEGER,
  priority_tier TEXT NOT NULL CHECK (priority_tier IN ('low', 'medium', 'high', 'urgent')),
  inputs JSONB,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.lpi_history IS 
  'Audit log of Lead Prioritization Index (LPI) scores and re-scoring events over time.';

CREATE INDEX IF NOT EXISTS idx_lpi_history_lead_id ON public.lpi_history(lead_id, scored_at DESC);

-- Enable RLS on lpi_history
ALTER TABLE public.lpi_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'lpi_history' AND policyname = 'policy_lpi_history_access_all'
  ) THEN
    CREATE POLICY policy_lpi_history_access_all ON public.lpi_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
