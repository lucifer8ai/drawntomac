-- Add discover_artist_ids to profiles + get_discover_feed RPC
-- Allows users to see albums from their selected artists on the #d.Yours feed

-- 1. Add column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discover_artist_ids UUID[];

-- 2. get_discover_feed RPC — flat join of artists→release_groups→songs
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

  IF artist_ids IS NULL OR array_length(artist_ids, 1) < 3 THEN
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

-- 3. Verification queries (run manually after migration)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'discover_artist_ids';
--
-- SELECT proname, prorettype::regtype
-- FROM pg_proc WHERE proname = 'get_discover_feed';
--
-- SELECT * FROM public.get_discover_feed('00000000-0000-0000-0000-000000000000'::UUID);
--
-- SELECT grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_name = 'get_discover_feed';

-- Rollback:
-- DROP FUNCTION IF EXISTS public.get_discover_feed(UUID);
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS discover_artist_ids;
