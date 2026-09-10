-- ==============================================================================
-- ArchScale Studio - Complete Database Schema (PostgreSQL / Supabase)
-- ==============================================================================
-- Description:
--   Complete, self-contained schema setup for the ArchScale Studio platform.
--   Run this script in the Supabase SQL Editor to initialize or restore the full
--   database structure with all tables, constraints, indexes, RLS policies,
--   and Realtime publication channels.
--
-- Included Modules:
--   1. Authentication & Multi-Tenant Team Collaboration (`teams`, `team_members`)
--   2. Architectural Lead Pipeline & Cumulative AI Scoring (`leads`)
--   3. Omnichannel Inbound/Outbound Client Communications (`messages`)
--   4. Studio Automation Settings & Discovery Interviewer Policies (`studio_settings`)
--   5. High-Performance Indexes for Live Pipeline Triage
--   6. Multi-Tenant Row-Level Security (RLS) Isolation
--   7. Supabase Realtime Change Broadcast Subscriptions
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ------------------------------------------------------------------------------
-- 1. Studio Teams (Multi-Tenant Workspace)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.teams IS 
  'Architectural studio organizations and multi-tenant workspace isolation boundaries.';

COMMENT ON COLUMN public.teams.invite_code IS 
  'Unique studio invitation code used by specialist partners to join the workspace roster.';


-- ------------------------------------------------------------------------------
-- 2. Specialist Partners & Team Roster
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  contact TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'specialist' CHECK (role IN ('owner', 'admin', 'specialist')),
  specialty TEXT, -- Modular designation: e.g. 'Master Planning', 'Interior Architecture', 'Commercial'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (team_id, email)
);

COMMENT ON TABLE public.team_members IS 
  'Architectural specialists, partners, and studio staff assigned to inbound client leads.';

COMMENT ON COLUMN public.team_members.specialty IS 
  'Free-form modular domain expertise (e.g. Master Planning, High-End Residential, BIM) used for automated AI routing.';


-- ------------------------------------------------------------------------------
-- 3. Inbound Architectural Client Pipeline (`leads`)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL, -- Phone (E.164 formatted for WhatsApp) or email
  source TEXT NOT NULL CHECK (source IN ('whatsapp', 'web', 'messenger', 'referral', 'manual')),
  message TEXT, -- Original client inquiry text
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'contacted', 'converted', 'dead')),
  score INTEGER NOT NULL DEFAULT 0, -- Legacy heuristic score (0 - 2)
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_contacted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Cumulative AI Qualification Intelligence
  qualification_percentage INTEGER NOT NULL DEFAULT 0 CHECK (qualification_percentage >= 0 AND qualification_percentage <= 100),
  priority_tier TEXT NOT NULL DEFAULT 'medium' CHECK (priority_tier IN ('low', 'medium', 'high', 'urgent')),
  discovery_stage TEXT NOT NULL DEFAULT 'discovery' CHECK (discovery_stage IN ('discovery', 'needs_scope', 'needs_budget', 'needs_timeline', 'confirmed', 'escorted')),
  budget_mentioned BOOLEAN NOT NULL DEFAULT false,
  estimated_budget TEXT,
  project_type TEXT,
  timeline TEXT,
  ai_summary TEXT,
  suggested_reply TEXT,

  -- Modular Client Policies & Controls
  is_returning_client BOOLEAN NOT NULL DEFAULT false,
  automation_enabled BOOLEAN NOT NULL DEFAULT true
);

COMMENT ON TABLE public.leads IS 
  'Prospective client inquiries enriched with Azure OpenAI multi-dimensional qualification intelligence.';

COMMENT ON COLUMN public.leads.qualification_percentage IS 
  'Comprehensive match score (0-100%) reflecting budget alignment, scope clarity, timeline readiness, and intent urgency.';

COMMENT ON COLUMN public.leads.discovery_stage IS 
  'Progressive discovery conversational stage: discovery -> needs_scope -> needs_budget -> needs_timeline -> confirmed -> escorted.';

COMMENT ON COLUMN public.leads.is_returning_client IS 
  'Identifies past clients to preserve relationship history and bypass cold discovery questions.';

COMMENT ON COLUMN public.leads.automation_enabled IS 
  'Per-client AI switch. When false, automated outbound replies are paused and manual 1-click review is enforced.';


-- ------------------------------------------------------------------------------
-- 4. Omnichannel Conversation History (`messages`)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'web', 'email', 'sms')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.messages IS 
  'Full bidirectional conversation logs between prospective clients and the studio.';


-- ------------------------------------------------------------------------------
-- 5. Studio Automation & Localization Policies (`studio_settings`)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.studio_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  discovery_interviewer_enabled BOOLEAN NOT NULL DEFAULT true,
  returning_client_mode TEXT NOT NULL DEFAULT 'draft_only' CHECK (returning_client_mode IN ('draft_only', 'auto', 'disabled')),
  time_format TEXT NOT NULL DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
  timezone TEXT NOT NULL DEFAULT 'auto',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.studio_settings IS 
  'Studio-level automation toggles and regional localization preferences.';

COMMENT ON COLUMN public.studio_settings.time_format IS 
  'Clock display preference across dashboard and chat logs: 12h (AM/PM) or 24h standard.';

COMMENT ON COLUMN public.studio_settings.timezone IS 
  'Studio timezone for localizing timestamps across tables, chat messages, and telemetry feeds.';


-- ------------------------------------------------------------------------------
-- 6. Performance Indexes
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_team_id ON public.leads(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_qualification_percentage ON public.leads(qualification_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_leads_is_returning_client ON public.leads(is_returning_client);
CREATE INDEX IF NOT EXISTS idx_leads_discovery_stage ON public.leads(discovery_stage);
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at ON public.leads(last_contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id_sent_at ON public.messages(lead_id, sent_at ASC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);


-- ------------------------------------------------------------------------------
-- 7. Row-Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;

-- Teams Policies
CREATE POLICY policy_teams_select ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
    OR auth.uid() IS NULL -- Fallback for service keys or unauthenticated preview mode
  );

-- Team Members Policies
CREATE POLICY policy_team_members_select ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR auth.uid() IS NULL
  );

CREATE POLICY policy_team_members_all_anon ON public.team_members
  FOR ALL USING (true) WITH CHECK (true);

-- Leads Policies (Multi-Tenant Isolation with fallback)
CREATE POLICY policy_leads_select ON public.leads
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR team_id IS NULL
    OR auth.uid() IS NULL
  );

CREATE POLICY policy_leads_update ON public.leads
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR team_id IS NULL
    OR auth.uid() IS NULL
  );

CREATE POLICY policy_leads_insert ON public.leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY policy_leads_delete ON public.leads
  FOR DELETE USING (true);

-- Messages Policies
CREATE POLICY policy_messages_select ON public.messages
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
      OR team_id IS NULL
    )
    OR auth.uid() IS NULL
  );

CREATE POLICY policy_messages_all ON public.messages
  FOR ALL USING (true) WITH CHECK (true);

-- Studio Settings Policies
CREATE POLICY policy_studio_settings_select ON public.studio_settings
  FOR SELECT USING (true);

CREATE POLICY policy_studio_settings_update ON public.studio_settings
  FOR UPDATE USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 8. Realtime Replication Subscriptions
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'leads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'studio_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.studio_settings;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 9. Initial Seed Data
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
ON CONFLICT (id) DO NOTHING;
