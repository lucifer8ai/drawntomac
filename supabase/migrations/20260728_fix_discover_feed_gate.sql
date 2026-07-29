-- Fix get_discover_feed: remove the <3 minimum (onboarding already enforces 3),
-- so users with 1-2 artists (post-editing) or empty arrays get graceful handling.
CREATE OR REPLACE FUNCTION public.get_discover_feed(p_user_id UUID)
RETURNS TABLE(
  artist_id UUID, artist_name TEXT, artist_slug TEXT, artist_image_url TEXT,
  release_group_id UUID, release_group_title TEXT, release_group_slug TEXT,
  release_group_image_url TEXT, release_group_release_date DATE,
  song_id UUID, song_title TEXT, song_slug TEXT, song_track_number INT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  artist_ids UUID[];
BEGIN
  SELECT discover_artist_ids INTO artist_ids
  FROM public.profiles WHERE id = p_user_id;

  IF artist_ids IS NULL OR array_length(artist_ids, 1) < 1 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id, a.name, a.slug, a.image_url,
    rg.id, rg.title, rg.slug, rg.image_url, rg.release_date,
    s.id, s.title, s.slug, COALESCE(s.track_number, 0)
  FROM public.artists a
  JOIN public.release_groups rg ON rg.artist_id = a.id
  JOIN public.songs s ON s.release_group_id = rg.id
  WHERE a.id = ANY(artist_ids)
  ORDER BY a.name, rg.release_date DESC, COALESCE(s.track_number, 0)
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_discover_feed(UUID)
  TO anon, authenticated, service_role;
