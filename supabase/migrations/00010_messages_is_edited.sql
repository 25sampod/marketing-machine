-- Migration 00010: Add is_edited column to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.messages.is_edited IS 'Flag indicating whether this message was edited in the dashboard or via WhatsApp';
