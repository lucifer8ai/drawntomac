-- Artist Discography: RLS fix, discography RPC, onboarding update, search recreate
-- Fixes: anon song_artists read, get_artist_discography, updated get_onboarding_artists,
-- recreated search_local_artists + search_local_albums (dropped in 20260723000000)

-- 1. Add anon SELECT to song_artists (public song page needs this)
DROP POLICY IF EXISTS "song_artists_read_anon" ON public.song_artists;
CREATE POLICY "song_artists_read_anon" ON public.song_artists
  FOR SELECT TO anon USING (true);

-- 2. get_artist_discography RPC — UNION lead + featured songs
DROP FUNCTION IF EXISTS public.get_artist_discography(UUID);
CREATE OR REPLACE FUNCTION public.get_artist_discography(p_artist_id UUID)
RETURNS TABLE(
  id UUID, title TEXT, slug TEXT,
  primary_artist_name TEXT, primary_artist_slug TEXT, primary_artist_image_url TEXT,
  role TEXT,
  image_url TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.slug,
    a.name, a.slug, a.image_url,
    'lead' AS role,
    s.genius_thumbnail_url, s.created_at
  FROM public.songs s
  JOIN public.artists a ON a.id = s.artist_id
  WHERE s.artist_id = p_artist_id
  UNION ALL
  SELECT s.id, s.title, s.slug,
    lead_a.name, lead_a.slug, lead_a.image_url,
    'featured' AS role,
    s.genius_thumbnail_url, s.created_at
  FROM public.song_artists sa
  JOIN public.songs s ON s.id = sa.song_id
  JOIN public.artists lead_a ON lead_a.id = s.artist_id
  WHERE sa.artist_id = p_artist_id
    AND sa.position >= 1
    AND s.artist_id != p_artist_id
  ORDER BY created_at DESC
  LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.get_artist_discography(UUID) TO anon, authenticated, service_role;

-- 3. Update get_onboarding_artists — count primary + featured
CREATE OR REPLACE FUNCTION public.get_onboarding_artists()
RETURNS TABLE(id UUID, name TEXT, image_url TEXT, song_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH counts AS (
    SELECT s.artist_id AS aid, COUNT(*) AS cnt FROM public.songs s
    WHERE s.artist_id IS NOT NULL GROUP BY s.artist_id
    UNION ALL
    SELECT sa.artist_id AS aid, COUNT(*) AS cnt FROM public.song_artists sa
    WHERE sa.position >= 1 GROUP BY sa.artist_id
  ),
  totals AS (SELECT aid, SUM(cnt) AS total FROM counts GROUP BY aid)
  SELECT a.id, a.name, a.image_url, COALESCE(t.total, 0) AS song_count
  FROM public.artists a
  JOIN totals t ON t.aid = a.id
  WHERE t.total >= 10
  ORDER BY a.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_onboarding_artists() TO authenticated;

-- 4. Recreate search_local_artists (dropped in 20260723000000) — includes song_count
CREATE OR REPLACE FUNCTION public.search_local_artists(
  p_query TEXT, p_limit INT DEFAULT 3
) RETURNS TABLE(
  artist_id UUID, name TEXT, slug TEXT, image_url TEXT,
  musicbrainz_id TEXT, song_count BIGINT, similarity DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN RETURN; END IF;
  p_query := replace(replace(p_query, '%', '\%'), '_', '\_');
  RETURN QUERY
  WITH counts AS (
    SELECT s.artist_id AS aid, COUNT(*) AS cnt FROM public.songs s
    WHERE s.artist_id IS NOT NULL GROUP BY s.artist_id
    UNION ALL
    SELECT sa.artist_id AS aid, COUNT(*) AS cnt FROM public.song_artists sa
    WHERE sa.position >= 1 GROUP BY sa.artist_id
  ),
  totals AS (SELECT aid, SUM(cnt) AS total FROM counts GROUP BY aid)
  SELECT a.id, a.name, a.slug, a.image_url, a.musicbrainz_id,
    COALESCE(t.total, 0) AS song_count,
    similarity(a.name, p_query) AS similarity
  FROM public.artists a
  LEFT JOIN totals t ON t.aid = a.id
  WHERE a.name ILIKE '%' || p_query || '%'
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_local_artists(TEXT, INT) TO anon, authenticated, service_role;

-- 5. Recreate search_local_albums (dropped in 20260723000000)
CREATE OR REPLACE FUNCTION public.search_local_albums(
  p_query TEXT,
  p_limit INT DEFAULT 3
) RETURNS TABLE(
  release_group_mbid TEXT,
  title TEXT,
  artist_name TEXT,
  cover_url TEXT,
  song_count BIGINT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ranked AS (
    SELECT DISTINCT ON (s.release_group_mbid)
      s.release_group_mbid,
      s.title,
      a.name AS artist_name,
      s.genius_thumbnail_url AS cover_url,
      similarity(s.title, p_query) AS sim
    FROM public.songs s
    LEFT JOIN public.artists a ON a.id = s.artist_id
    WHERE s.release_group_mbid IS NOT NULL
      AND (
        s.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
        OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
      )
    ORDER BY s.release_group_mbid, sim DESC
  ),
  counted AS (
    SELECT
      s.release_group_mbid,
      COUNT(*) AS sc
    FROM public.songs s
    WHERE s.release_group_mbid IN (SELECT release_group_mbid FROM ranked)
    GROUP BY s.release_group_mbid
  )
  SELECT
    r.release_group_mbid,
    r.title,
    r.artist_name,
    r.cover_url,
    COALESCE(c.sc, 0) AS song_count,
    r.sim AS similarity
  FROM ranked r
  LEFT JOIN counted c ON c.release_group_mbid = r.release_group_mbid
  ORDER BY r.sim DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_albums(TEXT, INT) TO anon, authenticated, service_role;
