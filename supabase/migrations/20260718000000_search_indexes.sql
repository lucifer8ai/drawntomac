-- Stage 1: Search Engine Fix — trigram indexes + local song search RPC

-- Enable trigram extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fast similarity + ILIKE queries
CREATE INDEX IF NOT EXISTS idx_songs_title_trgm ON public.songs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON public.artists USING gin (name gin_trgm_ops);

-- Local song search RPC: ILIKE + similarity ranking
-- SECURITY DEFINER: runs as owner, bypasses RLS. Safe because it only SELECTs public data.
-- anon grant is intentional for unauthenticated search.
CREATE OR REPLACE FUNCTION public.search_local_songs(
  p_query TEXT,
  p_limit INT DEFAULT 5
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
  -- Empty query guard: prevent full-table scan on ILIKE '%%'
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
  WHERE s.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_songs(TEXT, INT) TO anon, authenticated, service_role;
