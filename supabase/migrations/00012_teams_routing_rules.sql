-- Migration 00012: Add modular routing_rules JSONB column to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS routing_rules JSONB DEFAULT '[]'::jsonb;
