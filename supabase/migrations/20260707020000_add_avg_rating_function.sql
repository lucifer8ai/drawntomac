-- Migration: Add get_song_avg_rating function for song page rating aggregation

CREATE OR REPLACE FUNCTION public.get_song_avg_rating(song_uuid UUID)
RETURNS TABLE(avg_rating numeric, rating_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as rating_count
  FROM public.diary_entries
  WHERE song_id = song_uuid
    AND type IN ('heard', 'rating')
    AND rating IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_song_avg_rating(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_song_avg_rating(UUID) TO service_role;
