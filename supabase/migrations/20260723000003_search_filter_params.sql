-- Upgrade search_local_songs RPC with language/era filter params
-- Used by /api/search when the browse page passes filter dimensions

DROP FUNCTION IF EXISTS public.search_local_songs(TEXT, INT);

CREATE OR REPLACE FUNCTION public.search_local_songs(
  p_query TEXT,
  p_limit INT DEFAULT 8,
  p_language TEXT DEFAULT NULL,
  p_era TEXT DEFAULT NULL
) RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  thumbnail_url TEXT,
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
    s.id AS song_id,
    s.title,
    s.slug,
    a.name AS artist_name,
    s.genius_thumbnail_url AS thumbnail_url,
    s.musicbrainz_id,
    GREATEST(
      similarity(s.title, p_query),
      similarity(a.name, p_query)
    ) AS similarity
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE (s.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'))
    AND (p_language IS NULL OR s.language @> ARRAY[p_language]::text[])
    AND (p_era IS NULL OR s.era = p_era)
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_songs(TEXT, INT, TEXT, TEXT) TO anon, authenticated, service_role;
