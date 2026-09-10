-- ==============================================================================
-- Migration 00003: Lead Discovery Intelligence, Client History & Studio Settings
-- Target Environment: Supabase / PostgreSQL
-- Purpose:
--   1. Expands `public.leads` with multi-dimensional AI qualification metrics,
--      conversational discovery intake stages, returning client recognition flags,
--      and per-client automation controls.
--   2. Creates `public.studio_settings` for modular studio-wide automation policies
--      (discovery interviewer toggle, returning client policy mode, email alerts).
--   3. Configures performance indexes, Row-Level Security (RLS), and Realtime sync.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend `public.leads` with Discovery & Cumulative Intelligence Columns
-- ------------------------------------------------------------------------------

-- Add qualification percentage (0 - 100 integer score computed by Azure OpenAI)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS qualification_percentage INTEGER DEFAULT 0 
  CHECK (qualification_percentage >= 0 AND qualification_percentage <= 100);

-- Add priority tier classification ('low', 'medium', 'high', 'urgent')
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS priority_tier TEXT DEFAULT 'medium' 
  CHECK (priority_tier IN ('low', 'medium', 'high', 'urgent'));

-- Add conversational discovery intake stage
-- Allowed stages: 'discovery', 'needs_scope', 'needs_budget', 'needs_timeline', 'confirmed', 'escorted'
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS discovery_stage TEXT DEFAULT 'discovery';

-- Add returning client flag (distinguishes past clients from cold new leads)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS is_returning_client BOOLEAN DEFAULT false;

-- Add per-client automation switch (allows partners to pause AI replies per thread)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS automation_enabled BOOLEAN DEFAULT true;

-- Add extracted project timeline (e.g., 'Q3 2026', 'Immediate', '6 months')
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS timeline TEXT;

-- Add extracted estimated budget (e.g., '$150,000', '€2.5M')
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS estimated_budget TEXT;

-- Add cumulative AI summary of project requirements and intent
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add latest AI suggested reply draft for 1-click partner review
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS suggested_reply TEXT;


-- ------------------------------------------------------------------------------
-- 2. Add Clear Self-Documenting Column Comments
-- ------------------------------------------------------------------------------

COMMENT ON COLUMN public.leads.qualification_percentage IS 
  'Multi-dimensional AI qualification score (0-100%) weighted by budget viability, scope typology, intent urgency, and site readiness.';

COMMENT ON COLUMN public.leads.priority_tier IS 
  'Lead triage tier: low (<40%), medium (40-69%), high (70-84%), or urgent (85-100%).';

COMMENT ON COLUMN public.leads.discovery_stage IS 
  'Current stage in progressive discovery intake: discovery, needs_scope, needs_budget, needs_timeline, confirmed, or escorted.';

COMMENT ON COLUMN public.leads.is_returning_client IS 
  'True if the client previously inquired or completed a past project with the studio.';

COMMENT ON COLUMN public.leads.automation_enabled IS 
  'Per-thread toggle. When false, automated WhatsApp dispatches are halted and AI generates 1-click drafts only.';

COMMENT ON COLUMN public.leads.ai_summary IS 
  'Structured summary of the client architectural scope, budget, and location requirements.';

COMMENT ON COLUMN public.leads.suggested_reply IS 
  'Contextual AI response draft prepared for specialist review and 1-click dispatch.';


-- ------------------------------------------------------------------------------
-- 3. Create Indexes for High-Performance Pipeline Queries
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_leads_qualification_percentage 
  ON public.leads(qualification_percentage DESC);

CREATE INDEX IF NOT EXISTS idx_leads_is_returning_client 
  ON public.leads(is_returning_client);

CREATE INDEX IF NOT EXISTS idx_leads_discovery_stage 
  ON public.leads(discovery_stage);

CREATE INDEX IF NOT EXISTS idx_leads_automation_enabled 
  ON public.leads(automation_enabled);


-- ------------------------------------------------------------------------------
-- 4. Create `public.studio_settings` Modular Automation Configuration Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.studio_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  discovery_interviewer_enabled BOOLEAN NOT NULL DEFAULT true,
  returning_client_mode TEXT NOT NULL DEFAULT 'draft_only' 
    CHECK (returning_client_mode IN ('draft_only', 'auto', 'disabled')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.studio_settings IS 
  'Studio-wide automation policies governing AI discovery interviewer and returning client VIP treatment.';

COMMENT ON COLUMN public.studio_settings.auto_reply_enabled IS 
  'Master switch for automated outbound WhatsApp messages.';

COMMENT ON COLUMN public.studio_settings.email_alerts_enabled IS 
  'Dispatches instant email notifications to studio owner when qualification >= 60% or lead is escorted.';

COMMENT ON COLUMN public.studio_settings.discovery_interviewer_enabled IS 
  'Enables progressive conversational discovery questions for brand new incoming leads.';

COMMENT ON COLUMN public.studio_settings.returning_client_mode IS 
  'Policy for past clients: draft_only (1-click draft review), auto (automated VIP welcome), or disabled.';


-- ------------------------------------------------------------------------------
-- 5. Seed Default Settings Record (Safe Upsert)
-- ------------------------------------------------------------------------------

INSERT INTO public.studio_settings (
  id,
  auto_reply_enabled,
  email_alerts_enabled,
  discovery_interviewer_enabled,
  returning_client_mode
) VALUES (
  'default',
  true,
  true,
  true,
  'draft_only'
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = timezone('utc'::text, now());


-- ------------------------------------------------------------------------------
-- 6. Row-Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------

ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

-- Allow reading studio configuration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'studio_settings' AND policyname = 'policy_studio_settings_select_all'
  ) THEN
    CREATE POLICY policy_studio_settings_select_all 
      ON public.studio_settings 
      FOR SELECT 
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'studio_settings' AND policyname = 'policy_studio_settings_update_all'
  ) THEN
    CREATE POLICY policy_studio_settings_update_all 
      ON public.studio_settings 
      FOR UPDATE 
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 7. Realtime Publication Enablement
-- ------------------------------------------------------------------------------

-- Ensure studio_settings and leads emit Realtime change events to clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'studio_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_settings;
  END IF;
END $$;
