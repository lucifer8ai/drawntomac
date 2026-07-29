-- Update get_artist_engagement to count songs where artist appears via song_artists junction
-- (not just songs where they are the primary artist_id)

CREATE OR REPLACE FUNCTION public.get_artist_engagement(
  p_artist_id UUID
) RETURNS TABLE(
  total_hears BIGINT,
  total_likes BIGINT,
  total_reviews BIGINT,
  total_listeners BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH artist_songs AS (
    -- Songs where this artist is the primary artist_id
    SELECT id FROM public.songs WHERE artist_id = p_artist_id
    UNION
    -- Songs where this artist appears via song_artists junction
    SELECT sa.song_id AS id
    FROM public.song_artists sa
    WHERE sa.artist_id = p_artist_id
  )
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN artist_songs AS s ON s.id = de.song_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_engagement(UUID) TO anon, authenticated, service_role;
