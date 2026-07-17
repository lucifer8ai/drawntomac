-- Stage 2: Categorized Search Results — artist + album local search RPCs

-- Local artist search RPC
CREATE OR REPLACE FUNCTION public.search_local_artists(
  p_query TEXT,
  p_limit INT DEFAULT 3
) RETURNS TABLE(
  artist_id UUID,
  name TEXT,
  slug TEXT,
  image_url TEXT,
  musicbrainz_id TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id AS artist_id,
    a.name,
    a.slug,
    a.image_url,
    a.musicbrainz_id,
    similarity(a.name, p_query) AS similarity
  FROM public.artists a
  WHERE a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_artists(TEXT, INT) TO anon, authenticated, service_role;

-- Local album search RPC — groups songs by release_group_mbid
-- Uses DISTINCT ON ... ORDER BY sim DESC to pick best-matching title as proxy
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
