-- Migration: Add get_connecting_song_details RPC and drop get_connecting_songs
-- Replaces the recommendation engine (unheard songs from top matches) with an
-- overlap report (songs both users have diary entries for).

CREATE OR REPLACE FUNCTION public.get_connecting_song_details(
  viewer_id UUID,
  target_id UUID
)
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  viewer_types TEXT[],
  target_types TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id AS song_id,
    s.title,
    s.slug,
    a.name AS artist_name,
    s.genius_thumbnail_url AS album_art_url,
    array_agg(DISTINCT d1.type ORDER BY d1.type) FILTER (WHERE d1.user_id = viewer_id) AS viewer_types,
    array_agg(DISTINCT d2.type ORDER BY d2.type) FILTER (WHERE d2.user_id = target_id) AS target_types
  FROM public.diary_entries d1
  JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
  JOIN public.songs s ON s.id = d1.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE d1.user_id = viewer_id
    AND d2.user_id = target_id
  GROUP BY s.id, s.title, s.slug, a.name, s.genius_thumbnail_url
  ORDER BY s.title;
$$;

GRANT EXECUTE ON FUNCTION public.get_connecting_song_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connecting_song_details(UUID, UUID) TO service_role;

DROP FUNCTION IF EXISTS public.get_connecting_songs(UUID, INT);
