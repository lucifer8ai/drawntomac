-- Add enrichment columns for language/era browsing and canon/seed distinction
-- Phase 1 of the Indian music data pipeline

-- Enrichment columns on songs
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS language TEXT[] DEFAULT '{}';
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS era TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'tail';

-- Index of CHECK constraint: validate source_type values
ALTER TABLE public.songs ADD CONSTRAINT songs_source_type_check CHECK (source_type IN ('canon', 'tail'));

-- Composite partial index: browse queries filter canon songs by language and era
CREATE INDEX IF NOT EXISTS idx_songs_browse
  ON public.songs (source_type, language, era)
  WHERE source_type = 'canon';

-- pg_cron job: promote tail songs to canon when they reach 5+ diary entries
-- Runs every 6 hours with zero query-time overhead
CREATE OR REPLACE FUNCTION public.promote_tail_to_canon()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.songs
  SET source_type = 'canon'
  WHERE source_type = 'tail'
    AND id IN (
      SELECT song_id
      FROM public.diary_entries
      GROUP BY song_id
      HAVING count(*) >= 5
    );
$$;

GRANT EXECUTE ON FUNCTION public.promote_tail_to_canon() TO service_role;

-- Schedule: every 6 hours. Safe if pg_cron is not enabled — the function
-- just won't run, and a manual call works the same.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule('promote-canon', '0 */6 * * *', 'SELECT public.promote_tail_to_canon()');
  END IF;
END;
$$;

-- Rollback:
-- DROP INDEX IF EXISTS idx_songs_browse;
-- ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_source_type_check;
-- ALTER TABLE public.songs DROP COLUMN IF EXISTS source_type;
-- ALTER TABLE public.songs DROP COLUMN IF EXISTS era;
-- ALTER TABLE public.songs DROP COLUMN IF EXISTS language;
-- DROP FUNCTION IF EXISTS public.promote_tail_to_canon();
-- SELECT cron.unschedule('promote-canon');
