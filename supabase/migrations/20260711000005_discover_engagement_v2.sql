-- Migration: Discover engagement v2 — windowed trending, top movers, connecting songs, social proof

-- 1. Update get_trending_songs — add window_days parameter
DROP FUNCTION IF EXISTS get_trending_songs();
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
  WHERE de.created_at >= now() - (window_days || ' days')::interval
  GROUP BY de.song_id
  ORDER BY trending_score DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO service_role;


-- 2. Create get_top_movers — songs with biggest positive rank deltas (7-day vs previous 7-day)
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
    WHERE pr.rank IS NOT NULL AND (pr.rank - cr.rank) > 0
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
    ORDER BY cr.score DESC
  )
  SELECT * FROM climbers
  UNION ALL
  SELECT * FROM debuts
  ORDER BY
    CASE WHEN rank_delta IS NULL THEN 1 ELSE 0 END,
    rank_delta DESC NULLS LAST
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_movers(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_movers(INT) TO service_role;


-- 3. Update get_compatible_users — add sort_mode, page_offset, last_active_at, top_shared_artist, current_user_total
DROP FUNCTION IF EXISTS get_compatible_users(UUID);

CREATE OR REPLACE FUNCTION public.get_compatible_users(
  current_user_id UUID,
  sort_mode TEXT DEFAULT 'composite',
  page_offset INT DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  shared_songs bigint,
  shared_heard bigint,
  shared_liked bigint,
  shared_disliked bigint,
  shared_want bigint,
  shared_reviewed bigint,
  liked_songs TEXT[],
  want_songs TEXT[],
  last_active_at TIMESTAMPTZ,
  top_shared_artist TEXT,
  current_user_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shared AS (
    SELECT
      d2.user_id,
      COUNT(*) AS shared_songs,
      COUNT(*) FILTER (WHERE d2.type = 'heard') AS shared_heard,
      COUNT(*) FILTER (WHERE d2.type = 'like') AS shared_liked,
      COUNT(*) FILTER (WHERE d2.type = 'dislike') AS shared_disliked,
      COUNT(*) FILTER (WHERE d2.type = 'want') AS shared_want,
      COUNT(*) FILTER (WHERE d2.type = 'review') AS shared_reviewed,
      MAX(d2.created_at) AS last_active_at
    FROM public.diary_entries d1
    JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
    WHERE d1.user_id = current_user_id
      AND d2.user_id != current_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = current_user_id AND blocked_id = d2.user_id)
           OR (blocker_id = d2.user_id AND blocked_id = current_user_id)
      )
    GROUP BY d2.user_id
  ),
  liked AS (
    SELECT
      de.user_id,
      ARRAY(
        SELECT s2.title
        FROM public.diary_entries de2
        JOIN public.songs s2 ON s2.id = de2.song_id
        WHERE de2.user_id = de.user_id
          AND de2.type = 'like'
          AND de2.song_id IN (
            SELECT d1.song_id FROM public.diary_entries d1 WHERE d1.user_id = current_user_id
          )
        LIMIT 3
      ) AS liked_songs
    FROM public.diary_entries de
    WHERE de.user_id IN (SELECT user_id FROM shared)
    GROUP BY de.user_id
  ),
  want AS (
    SELECT
      de.user_id,
      ARRAY(
        SELECT s2.title
        FROM public.diary_entries de2
        JOIN public.songs s2 ON s2.id = de2.song_id
        WHERE de2.user_id = de.user_id
          AND de2.type = 'want'
          AND de2.song_id IN (
            SELECT d1.song_id FROM public.diary_entries d1 WHERE d1.user_id = current_user_id
          )
        LIMIT 3
      ) AS want_songs
    FROM public.diary_entries de
    WHERE de.user_id IN (SELECT user_id FROM shared)
    GROUP BY de.user_id
  ),
  top_artist AS (
    SELECT DISTINCT ON (de.user_id)
      de.user_id,
      a.name AS artist_name
    FROM public.diary_entries de
    JOIN public.songs s3 ON s3.id = de.song_id
    JOIN public.artists a ON a.id = s3.artist_id
    WHERE de.user_id IN (SELECT user_id FROM shared)
      AND de.song_id IN (
        SELECT d1.song_id FROM public.diary_entries d1 WHERE d1.user_id = current_user_id
      )
    GROUP BY de.user_id, a.name
    ORDER BY de.user_id, COUNT(*) DESC
  ),
  user_total AS (
    SELECT COUNT(*)::bigint AS total FROM public.diary_entries WHERE user_id = current_user_id
  )
  SELECT
    s.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    s.shared_songs,
    s.shared_heard,
    s.shared_liked,
    s.shared_disliked,
    s.shared_want,
    s.shared_reviewed,
    COALESCE(l.liked_songs, ARRAY[]::TEXT[]) AS liked_songs,
    COALESCE(w.want_songs, ARRAY[]::TEXT[]) AS want_songs,
    s.last_active_at,
    ta.artist_name AS top_shared_artist,
    ut.total AS current_user_total
  FROM user_total ut
  LEFT JOIN shared s ON true
  LEFT JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN liked l ON l.user_id = s.user_id
  LEFT JOIN want w ON w.user_id = s.user_id
  LEFT JOIN top_artist ta ON ta.user_id = s.user_id
  ORDER BY
    CASE
      WHEN sort_mode = 'count' THEN s.shared_songs
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN sort_mode = 'composite' THEN (
        s.shared_heard * 1.0 +
        s.shared_liked * 2.0 +
        s.shared_reviewed * 3.0 +
        s.shared_want * 1.5 +
        s.shared_disliked * 0.5
      )
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN sort_mode = 'recent' THEN 0
      ELSE NULL
    END,
    s.last_active_at DESC NULLS LAST
  LIMIT 20
  OFFSET page_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_compatible_users(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compatible_users(UUID, TEXT, INT) TO service_role;


-- 4. Create get_connecting_songs — songs from top 3 compatible users that current user hasn't interacted with
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
  ORDER BY random()
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_connecting_songs(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connecting_songs(UUID, INT) TO service_role;


-- 5. Create get_trending_social_proof — count how many compatible users have engaged with each song
CREATE OR REPLACE FUNCTION public.get_trending_social_proof(current_user_id UUID, song_ids UUID[])
RETURNS TABLE(
  song_id UUID,
  match_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH compat AS (
    SELECT user_id FROM public.get_compatible_users(current_user_id, 'composite', 0)
  )
  SELECT
    de.song_id,
    COUNT(DISTINCT de.user_id) AS match_count
  FROM public.diary_entries de
  WHERE de.user_id IN (SELECT user_id FROM compat)
    AND de.song_id = ANY(song_ids)
    AND de.type IN ('like', 'heard', 'review')
  GROUP BY de.song_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_social_proof(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_social_proof(UUID, UUID[]) TO service_role;
