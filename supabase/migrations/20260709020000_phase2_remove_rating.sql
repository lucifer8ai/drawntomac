-- Phase 2: Remove rating type, drop rating column, replace RPC
-- Runs after code deploys and Phase 1 is verified.

-- Delete old rating rows (irreversible — user opted to start fresh)
DELETE FROM public.diary_entries WHERE type = 'rating';

-- Drop rating column
ALTER TABLE public.diary_entries DROP COLUMN IF EXISTS rating;

-- Replace the CHECK constraint (remove 'rating')
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'diary_entries'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%heard%want%like%dislike%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.diary_entries DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.diary_entries
  ADD CONSTRAINT diary_entries_type_check
  CHECK (type IN ('heard', 'want', 'like', 'dislike', 'review'));

-- Replace avg_rating RPC with like/dislike counts
DROP FUNCTION IF EXISTS public.get_song_avg_rating(UUID);

CREATE OR REPLACE FUNCTION public.get_song_like_counts(song_uuid UUID)
RETURNS TABLE(like_count bigint, dislike_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE type = 'like') as like_count,
    COUNT(*) FILTER (WHERE type = 'dislike') as dislike_count
  FROM public.diary_entries
  WHERE song_id = song_uuid
    AND type IN ('like', 'dislike');
$$;

GRANT EXECUTE ON FUNCTION public.get_song_like_counts(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_song_like_counts(UUID) TO service_role;
