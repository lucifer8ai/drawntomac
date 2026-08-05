-- Migration: Add artist_requests table for user artist suggestions
-- Users submit artist names, admin reviews and imports manually

CREATE TABLE IF NOT EXISTS public.artist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own requests" ON public.artist_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own requests" ON public.artist_requests
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.artist_requests TO authenticated;
GRANT ALL ON public.artist_requests TO service_role;
