-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'specialist', -- 'owner', 'admin', 'specialist'
  specialty TEXT, -- 'Commercial', 'Residential', 'Renovation'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, email)
);

-- 3. Add team_id to leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Team Members can only access their team's data
-- Teams
CREATE POLICY "Users can view their team" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

-- Team Members
CREATE POLICY "Users can view members of their team" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Leads (Strict Multi-Tenant Privacy Isolation)
CREATE POLICY "Users can view leads for their team" ON public.leads
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR team_id IS NULL -- Allow unassigned demo leads during transitional period
  );

CREATE POLICY "Users can update leads for their team" ON public.leads
  FOR UPDATE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR team_id IS NULL
  );

-- Messages
CREATE POLICY "Users can view messages for their team leads" ON public.messages
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM public.leads 
      WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
      OR team_id IS NULL
    )
  );
