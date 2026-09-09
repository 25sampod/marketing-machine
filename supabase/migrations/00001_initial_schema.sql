-- Create team_members table
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  specialty TEXT -- e.g., 'Commercial', 'Residential'
);

-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL, -- phone or email
  source TEXT NOT NULL, -- 'web', 'whatsapp', 'messenger'
  message TEXT,
  budget_mentioned BOOLEAN DEFAULT false,
  project_type TEXT,
  status TEXT DEFAULT 'new', -- 'new', 'qualified', 'contacted', 'converted', 'dead'
  score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES team_members(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_contacted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'inbound' or 'outbound'
  content TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp', 'web'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all for anon for the sake of the hackathon MVP, or service role)
-- In a real app we'd secure this, but since we are using Service Role key in API, it bypasses RLS anyway.
-- We'll just allow public read/write for the hackathon UI simplicity if they use anon key.
CREATE POLICY "Enable all access for anon on team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for anon on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for the leads and messages tables
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Insert some dummy team members
INSERT INTO team_members (name, contact, specialty) VALUES
('Alice Smith', 'alice@studio.com', 'Commercial'),
('Bob Jones', 'bob@studio.com', 'Residential'),
('Charlie Brown', 'charlie@studio.com', 'Renovation');
