-- Fix: search_local_albums queries release_groups directly with area filter + slug return.
-- 00003 created v2 (release_groups, slug, no area filter). 00004 overwrote with v3 (songs-based,
-- no slug, with area filter). This v4 merges both: release_groups query + area filter + slug.
-- Area filter: LEFT JOIN artists via rg.artist_id; NULL/empty countries = unknown = include.

DROP FUNCTION IF EXISTS public.search_local_albums(TEXT, INT);

CREATE OR REPLACE FUNCTION public.search_local_albums(
  p_query TEXT,
  p_limit INT DEFAULT 3
) RETURNS TABLE(
  release_group_mbid TEXT,
  title TEXT,
  artist_name TEXT,
  cover_url TEXT,
  song_count BIGINT,
  similarity DOUBLE PRECISION,
  slug TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    rg.musicbrainz_id AS release_group_mbid,
    rg.title,
    a.name AS artist_name,
    rg.image_url AS cover_url,
    sub.song_count,
    GREATEST(
      similarity(rg.title, p_query),
      COALESCE(similarity(a.name, p_query), 0)
    ) AS similarity,
    rg.slug
  FROM public.release_groups rg
  LEFT JOIN public.artists a ON a.id = rg.artist_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS song_count
    FROM public.songs s
    WHERE s.release_group_id = rg.id
  ) sub ON true
  WHERE
    (rg.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'))
    AND (
      a.artist_countries IS NULL
      OR cardinality(a.artist_countries) = 0
      OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_albums(TEXT, INT) TO anon, authenticated, service_role;
