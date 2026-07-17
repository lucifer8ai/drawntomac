-- Stage 3+4: Artist + Album Engagement RPCs

-- Covering index for diary entries — speeds up filtered aggregates for popular artists/albums
CREATE INDEX IF NOT EXISTS idx_de_song_type ON public.diary_entries(song_id, type);

-- Artist engagement: aggregated hears, likes, reviews, and unique listeners
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
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  WHERE s.artist_id = p_artist_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_engagement(UUID) TO anon, authenticated, service_role;

-- Album engagement: same pattern, scoped to release_group_id
CREATE OR REPLACE FUNCTION public.get_album_engagement(
  p_release_group_id UUID
) RETURNS TABLE(
  total_hears BIGINT,
  total_likes BIGINT,
  total_reviews BIGINT,
  total_listeners BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  WHERE s.release_group_id = p_release_group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_album_engagement(UUID) TO anon, authenticated, service_role;
