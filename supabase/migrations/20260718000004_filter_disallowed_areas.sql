-- Filter disallowed-area artists from discover/search RPCs
-- Uses artists.artist_countries (TEXT[] from 20260708010000) + && overlap operator
-- Treats NULL/empty as unknown (include, don't filter) to avoid hiding legitimate artists

-- GIN index for fast array-overlap queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_countries_gin
ON public.artists USING gin (artist_countries);

-- Helper: true when artist is from an allowed area (or area is unknown)
-- Called by RPCs that join through artist_id. Avoids repeating the same predicate.
CREATE OR REPLACE FUNCTION public.is_artist_area_allowed(p_artist_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.id = p_artist_id
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_artist_area_allowed(UUID) TO anon, authenticated, service_role;


-- ── Search RPCs ───────────────────────────────────────────────────────────

-- Update search_local_songs: filter by allowed area
DROP FUNCTION IF EXISTS public.search_local_songs(TEXT, INT);
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
  WHERE (
    s.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
    OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
  )
    AND (
      a.artist_countries IS NULL
      OR cardinality(a.artist_countries) = 0
      OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_songs(TEXT, INT) TO anon, authenticated, service_role;


-- Update search_local_artists: filter by allowed area
DROP FUNCTION IF EXISTS public.search_local_artists(TEXT, INT);
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
    AND (
      a.artist_countries IS NULL
      OR cardinality(a.artist_countries) = 0
      OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_artists(TEXT, INT) TO anon, authenticated, service_role;


-- Update search_local_albums: filter by allowed area via artist join
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
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
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


-- ── Discover RPCs ──────────────────────────────────────────────────────────

-- Update get_trending_songs: filter by allowed area
DROP FUNCTION IF EXISTS get_trending_songs(INT);
CREATE OR REPLACE FUNCTION public.get_trending_songs(window_days INT DEFAULT 30)
RETURNS TABLE(
  song_id UUID,
  trending_score bigint,
  heard_count bigint,
  like_count bigint,
  dislike_count bigint,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    de.song_id,
    COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS trending_score,
    COUNT(*) FILTER (WHERE de.type = 'heard') AS heard_count,
    COUNT(*) FILTER (WHERE de.type = 'like') AS like_count,
    COUNT(*) FILTER (WHERE de.type = 'dislike') AS dislike_count,
    COUNT(*) FILTER (WHERE de.type = 'review') AS review_count
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE de.created_at >= now() - (window_days || ' days')::interval
    AND (
      a.artist_countries IS NULL
      OR cardinality(a.artist_countries) = 0
      OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
    )
  GROUP BY de.song_id
  ORDER BY trending_score DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO service_role;


-- Update get_top_movers: filter by allowed area
DROP FUNCTION IF EXISTS get_top_movers(INT);
CREATE OR REPLACE FUNCTION public.get_top_movers(limit_count INT DEFAULT 5)
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  rank_delta bigint,
  current_score bigint,
  previous_score bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_window AS (
    SELECT
      de.song_id,
      COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS score
    FROM public.diary_entries de
    WHERE de.created_at >= now() - interval '7 days'
    GROUP BY de.song_id
  ),
  previous_window AS (
    SELECT
      de.song_id,
      COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS score
    FROM public.diary_entries de
    WHERE de.created_at >= now() - interval '14 days'
      AND de.created_at < now() - interval '7 days'
    GROUP BY de.song_id
  ),
  current_ranked AS (
    SELECT
      cw.song_id,
      cw.score,
      ROW_NUMBER() OVER (ORDER BY cw.score DESC) AS rank
    FROM current_window cw
  ),
  previous_ranked AS (
    SELECT
      pw.song_id,
      pw.score,
      ROW_NUMBER() OVER (ORDER BY pw.score DESC) AS rank
    FROM previous_window pw
  ),
  climbers AS (
    SELECT
      cr.song_id,
      s.title,
      s.slug,
      a.name AS artist_name,
      s.genius_thumbnail_url AS album_art_url,
      (pr.rank - cr.rank)::bigint AS rank_delta,
      cr.score AS current_score,
      pr.score AS previous_score
    FROM current_ranked cr
    JOIN public.songs s ON s.id = cr.song_id
    LEFT JOIN public.artists a ON a.id = s.artist_id
    JOIN previous_ranked pr ON pr.song_id = cr.song_id
    WHERE pr.rank IS NOT NULL
      AND (pr.rank - cr.rank) > 0
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
      )
  ),
  debuts AS (
    SELECT
      cr.song_id,
      s.title,
      s.slug,
      a.name AS artist_name,
      s.genius_thumbnail_url AS album_art_url,
      NULL::bigint AS rank_delta,
      cr.score AS current_score,
      NULL::bigint AS previous_score
    FROM current_ranked cr
    JOIN public.songs s ON s.id = cr.song_id
    LEFT JOIN public.artists a ON a.id = s.artist_id
    LEFT JOIN previous_ranked pr ON pr.song_id = cr.song_id
    WHERE pr.song_id IS NULL
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
      )
  ),
  combined AS (
    SELECT * FROM climbers
    UNION ALL
    SELECT * FROM debuts
  )
  SELECT * FROM combined
  ORDER BY
    CASE WHEN rank_delta IS NULL THEN 1 ELSE 0 END,
    rank_delta DESC NULLS LAST
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_movers(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_movers(INT) TO service_role;


-- Update get_for_you_songs: filter by allowed area
DROP FUNCTION IF EXISTS get_for_you_songs(UUID);
CREATE OR REPLACE FUNCTION public.get_for_you_songs(user_id UUID)
RETURNS TABLE(
  song_id UUID,
  trending_score bigint,
  heard_count bigint,
  like_count bigint,
  dislike_count bigint,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH compatible_users AS (
    SELECT d2.user_id AS cu_id
    FROM public.diary_entries d1
    JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
    WHERE d1.user_id = get_for_you_songs.user_id
      AND d2.user_id != get_for_you_songs.user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = get_for_you_songs.user_id AND blocked_id = d2.user_id)
           OR (blocker_id = d2.user_id AND blocked_id = get_for_you_songs.user_id)
      )
    GROUP BY d2.user_id
  ),
  trending AS (
    SELECT
      de.song_id,
      COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
        + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS base_score,
      COUNT(*) FILTER (WHERE de.type = 'heard') AS heard_count,
      COUNT(*) FILTER (WHERE de.type = 'like') AS like_count,
      COUNT(*) FILTER (WHERE de.type = 'dislike') AS dislike_count,
      COUNT(*) FILTER (WHERE de.type = 'review') AS review_count
    FROM public.diary_entries de
    JOIN public.songs s ON s.id = de.song_id
    LEFT JOIN public.artists a ON a.id = s.artist_id
    WHERE de.created_at >= now() - interval '30 days'
      AND (
        a.artist_countries IS NULL
        OR cardinality(a.artist_countries) = 0
        OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
      )
    GROUP BY de.song_id
  ),
  compatible_boost AS (
    SELECT
      de.song_id,
      COUNT(DISTINCT de.user_id) AS compatible_engagers
    FROM public.diary_entries de
    WHERE de.user_id IN (SELECT cu_id FROM compatible_users)
      AND de.created_at >= now() - interval '30 days'
    GROUP BY de.song_id
  )
  SELECT
    t.song_id,
    t.base_score + COALESCE(cb.compatible_engagers * 10, 0) AS trending_score,
    t.heard_count,
    t.like_count,
    t.dislike_count,
    t.review_count
  FROM trending t
  LEFT JOIN compatible_boost cb ON cb.song_id = t.song_id
  WHERE EXISTS (SELECT 1 FROM compatible_users)
  ORDER BY trending_score DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_for_you_songs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_for_you_songs(UUID) TO service_role;


-- Update get_recently_imported_songs: filter by allowed area
DROP FUNCTION IF EXISTS get_recently_imported_songs();
CREATE OR REPLACE FUNCTION public.get_recently_imported_songs()
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  genius_thumbnail_url TEXT
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
    s.genius_thumbnail_url
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE (
    a.artist_countries IS NULL
    OR cardinality(a.artist_countries) = 0
    OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
  )
  ORDER BY s.created_at DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_recently_imported_songs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recently_imported_songs() TO service_role;


-- Update get_connecting_songs: filter by allowed area
DROP FUNCTION IF EXISTS get_connecting_songs(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_connecting_songs(current_user_id UUID, limit_count INT DEFAULT 5)
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  source_display_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH top_compat AS (
    SELECT user_id FROM public.get_compatible_users(current_user_id, 'composite', 0)
    LIMIT 3
  ),
  user_songs AS (
    SELECT DISTINCT song_id FROM public.diary_entries WHERE user_id = current_user_id
  ),
  compat_entries AS (
    SELECT
      de.song_id,
      de.user_id,
      p.display_name
    FROM public.diary_entries de
    JOIN public.profiles p ON p.id = de.user_id
    WHERE de.user_id IN (SELECT user_id FROM top_compat)
      AND de.song_id NOT IN (SELECT song_id FROM user_songs)
  )
  SELECT
    s.id AS song_id,
    s.title,
    s.slug,
    a.name AS artist_name,
    s.genius_thumbnail_url AS album_art_url,
    ce.display_name AS source_display_name
  FROM compat_entries ce
  JOIN public.songs s ON s.id = ce.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE (
    a.artist_countries IS NULL
    OR cardinality(a.artist_countries) = 0
    OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[]
  )
  ORDER BY random()
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_connecting_songs(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connecting_songs(UUID, INT) TO service_role;
