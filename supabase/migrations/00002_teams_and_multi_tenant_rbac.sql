-- ==============================================================================
-- Migration 00002: Multi-Tenant Studio Teams & Role-Based Access Control (RBAC)
-- Target Environment: Supabase / PostgreSQL
-- Purpose:
--   1. Creates `public.teams` workspace table for architectural organizations.
--   2. Creates `public.team_members` for partner specialists and access roles.
--   3. Associates `public.leads` with their respective `team_id`.
--   4. Establishes multi-tenant Row-Level Security (RLS) isolation policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Studio Teams Table
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
  'Secure unique join code for onboarding specialists to the studio team.';


-- ------------------------------------------------------------------------------
-- 2. Create or Update Team Members Table (Partner Roster)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'specialist' CHECK (role IN ('owner', 'admin', 'specialist')),
  specialty TEXT, -- Free-form modular domain expertise
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Safely add multi-tenant columns if table already existed from baseline
ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'specialist';

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

COMMENT ON TABLE public.team_members IS 
  'Studio partners, specialists, and associates assigned to inbound leads.';

-- ------------------------------------------------------------------------------
-- 3. Seed Default ArchScale Studio Team
-- ------------------------------------------------------------------------------
INSERT INTO public.teams (id, name, invite_code)
VALUES ('00000000-0000-0000-0000-000000000001', 'ArchScale Architecture Studio', 'arch8899')
ON CONFLICT (id) DO UPDATE SET
  name = 'ArchScale Architecture Studio',
  invite_code = 'arch8899';


-- ------------------------------------------------------------------------------
-- 3. Associate Inbound Leads with Studio Teams
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.leads 
      ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. Enable Row-Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 5. Multi-Tenant RLS Policies with Clear, Explicit Identifiers
-- ------------------------------------------------------------------------------

-- Teams: Members and Owners can view their team
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teams' AND policyname = 'policy_teams_select_member_or_owner') THEN
    CREATE POLICY policy_teams_select_member_or_owner ON public.teams
      FOR SELECT USING (
        id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR owner_id = auth.uid()
        OR auth.uid() IS NULL
      );
  END IF;

  -- Team Members: Viewable by colleagues in the same studio
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'policy_team_members_select_colleagues') THEN
    CREATE POLICY policy_team_members_select_colleagues ON public.team_members
      FOR SELECT USING (
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR auth.uid() IS NULL
      );
  END IF;

  -- Leads: Viewable by team specialists (Multi-Tenant Isolation)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'policy_leads_select_team_members') THEN
    CREATE POLICY policy_leads_select_team_members ON public.leads
      FOR SELECT USING (
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR team_id IS NULL
        OR auth.uid() IS NULL
      );
  END IF;

  -- Leads: Modifiable by team specialists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'policy_leads_update_team_members') THEN
    CREATE POLICY policy_leads_update_team_members ON public.leads
      FOR UPDATE USING (
        team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
        OR team_id IS NULL
        OR auth.uid() IS NULL
      );
  END IF;

  -- Messages: Viewable by team specialists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'policy_messages_select_team_leads') THEN
    CREATE POLICY policy_messages_select_team_leads ON public.messages
      FOR SELECT USING (
        lead_id IN (
          SELECT id FROM public.leads 
          WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
          OR team_id IS NULL
        )
        OR auth.uid() IS NULL
      );
  END IF;
END $$;
