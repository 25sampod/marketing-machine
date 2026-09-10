-- ==============================================================================
-- Migration 00001: Core Studio Lead Intake, Communications & Specialist Schema
-- Target Environment: Supabase / PostgreSQL
-- Purpose:
--   1. Initializes base `public.team_members` roster.
--   2. Initializes base `public.leads` table for inbound architectural prospects.
--   3. Initializes `public.messages` table for multichannel conversation threads.
--   4. Configures base Row-Level Security (RLS) and Supabase Realtime publication.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Team Members Table (Studio Specialists)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  specialty TEXT -- Modular expertise: e.g. 'Commercial', 'Residential', 'Master Planning'
);

COMMENT ON TABLE public.team_members IS 
  'Architectural studio specialists and partners assigned to client inquiries.';


-- ------------------------------------------------------------------------------
-- 2. Create Leads Table (Client Inbound Pipeline)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL, -- Phone or email
  source TEXT NOT NULL, -- 'web', 'whatsapp', 'messenger'
  message TEXT,
  budget_mentioned BOOLEAN DEFAULT false,
  project_type TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'qualified', 'contacted', 'converted', 'dead'
  score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES public.team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_contacted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.leads IS 
  'Prospective client inquiries captured from WhatsApp, web intake, and referrals.';


-- ------------------------------------------------------------------------------
-- 3. Create Messages Table (Conversation Thread History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.messages IS 
  'Chronological log of inbound and outbound messages per lead thread.';


-- ------------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 5. Establish Clean Access Policies
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'policy_team_members_access_all') THEN
    CREATE POLICY policy_team_members_access_all ON public.team_members FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'policy_leads_access_all') THEN
    CREATE POLICY policy_leads_access_all ON public.leads FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'policy_messages_access_all') THEN
    CREATE POLICY policy_messages_access_all ON public.messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 6. Enable Realtime Sync for Live UI Pipeline Updates
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
END $$;


-- ------------------------------------------------------------------------------
-- 7. Seed Initial Studio Owner
-- ------------------------------------------------------------------------------
INSERT INTO public.team_members (name, contact, specialty)
SELECT 'Sampod', '25sampod@gmail.com', 'Master Planning & Architecture'
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members WHERE contact = '25sampod@gmail.com'
);
