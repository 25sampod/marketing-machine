-- Migration 00011: Add updated_at column to messages for edit tracking
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
