-- Migration: Add discover RPCs for personalized discovery engine

-- 1. Trending songs: top songs by engagement in last 30 days
CREATE OR REPLACE FUNCTION public.get_trending_songs()
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
  WHERE de.created_at >= now() - interval '30 days'
  GROUP BY de.song_id
  ORDER BY trending_score DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_songs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_songs() TO service_role;

-- 2. Compatible users: find users who share diary entries on the same songs
CREATE OR REPLACE FUNCTION public.get_compatible_users(current_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  shared_songs bigint,
  liked_songs TEXT[],
  want_songs TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH shared AS (
    SELECT
      d2.user_id,
      COUNT(*) AS shared_songs
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
        SELECT s.title
        FROM public.diary_entries de2
        JOIN public.songs s ON s.id = de2.song_id
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
        SELECT s.title
        FROM public.diary_entries de2
        JOIN public.songs s ON s.id = de2.song_id
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
  )
  SELECT
    s.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    s.shared_songs,
    COALESCE(l.liked_songs, ARRAY[]::TEXT[]) AS liked_songs,
    COALESCE(w.want_songs, ARRAY[]::TEXT[]) AS want_songs
  FROM shared s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN liked l ON l.user_id = s.user_id
  LEFT JOIN want w ON w.user_id = s.user_id
  ORDER BY s.shared_songs DESC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.get_compatible_users(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compatible_users(UUID) TO service_role;

-- 3. For You: re-rank trending songs weighted by compatible user engagement
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
    WHERE de.created_at >= now() - interval '30 days'
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

-- 4. Recently imported: 10 most recent songs with artist name
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
  ORDER BY s.created_at DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_recently_imported_songs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recently_imported_songs() TO service_role;
