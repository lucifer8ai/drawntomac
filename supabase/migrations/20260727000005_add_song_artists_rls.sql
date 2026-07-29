-- Fix: enable RLS on song_artists (flagged by Supabase security linter)
ALTER TABLE public.song_artists ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read song_artists (junction table, no sensitive data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'song_artists_read'
    AND tablename = 'song_artists'
  ) THEN
    CREATE POLICY "song_artists_read" ON public.song_artists
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
