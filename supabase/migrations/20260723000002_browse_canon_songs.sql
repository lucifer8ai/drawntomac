-- RPC: browse canon songs by language, era, genre, sort, pagination
-- Used by the browse/discover page for rich filtering

CREATE OR REPLACE FUNCTION public.browse_canon_songs(
  p_language TEXT DEFAULT NULL,
  p_era TEXT DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'trending',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  genre_tags TEXT[],
  language TEXT[],
  era TEXT,
  heard_count BIGINT,
  like_count BIGINT,
  review_count BIGINT,
  total_rows BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_limit > 100 THEN
    p_limit := 100;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      s.id,
      s.title,
      s.slug,
      a.name AS artist_name,
      s.genius_thumbnail_url AS album_art_url,
      s.genre_tags,
      s.language,
      s.era,
      COUNT(*) FILTER (WHERE de.type = 'heard') AS heard_count,
      COUNT(*) FILTER (WHERE de.type = 'like') AS like_count,
      COUNT(*) FILTER (WHERE de.type = 'review') AS review_count,
      COUNT(*) OVER () AS total_rows
    FROM public.songs s
    LEFT JOIN public.artists a ON a.id = s.artist_id
    LEFT JOIN public.diary_entries de ON de.song_id = s.id
    WHERE s.source_type = 'canon'
      AND (p_language IS NULL OR s.language @> ARRAY[p_language]::text[])
      AND (p_era IS NULL OR s.era = p_era)
      AND (p_genre IS NULL OR s.genre_tags @> ARRAY[p_genre]::text[])
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
      )
    GROUP BY s.id, s.title, s.slug, a.name, s.genius_thumbnail_url, s.genre_tags, s.language, s.era
  )
  SELECT
    f.id AS song_id,
    f.title,
    f.slug,
    f.artist_name,
    f.album_art_url,
    f.genre_tags,
    f.language,
    f.era,
    f.heard_count,
    f.like_count,
    f.review_count,
    f.total_rows
  FROM filtered f
  ORDER BY
    CASE WHEN p_sort = 'trending' THEN f.heard_count + f.like_count + f.review_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest' THEN 0 END,
    CASE WHEN p_sort = 'alphabetical' THEN 0 END,
    f.title ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Alphabetical sort: handled by the final f.title ASC fallback when p_sort = 'alphabetical'
-- Newest sort: handled by the existing trending feed RPCs (canon songs appear there naturally)

GRANT EXECUTE ON FUNCTION public.browse_canon_songs(TEXT, TEXT, TEXT, TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.browse_canon_songs(TEXT, TEXT, TEXT, TEXT, INT, INT) TO service_role;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.browse_canon_songs(TEXT, TEXT, TEXT, TEXT, INT, INT);
