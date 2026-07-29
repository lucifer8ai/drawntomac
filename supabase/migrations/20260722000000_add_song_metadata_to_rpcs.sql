-- Add artist_name, album_art_url, genre_tags to RPCs that return bare song IDs
-- These RPCs already JOIN songs + artists for filtering — just expose the columns.
-- Fixes FK ambiguity: clients no longer need embedded artist:artists() selects.

-- get_trending_songs: add title, slug, artist_name, album_art_url, genre_tags
DROP FUNCTION IF EXISTS get_trending_songs(INT);
CREATE OR REPLACE FUNCTION public.get_trending_songs(window_days INT DEFAULT 30)
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  genre_tags TEXT[],
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
    s.title,
    s.slug,
    a.name AS artist_name,
    s.genius_thumbnail_url AS album_art_url,
    s.genre_tags,
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
  GROUP BY de.song_id, s.title, s.slug, a.name, s.genius_thumbnail_url, s.genre_tags
  ORDER BY trending_score DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO service_role;

-- get_for_you_songs: add title, slug, artist_name, album_art_url, genre_tags
DROP FUNCTION IF EXISTS get_for_you_songs(UUID);
CREATE OR REPLACE FUNCTION public.get_for_you_songs(user_id UUID)
RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  genre_tags TEXT[],
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
      s.title,
      s.slug,
      a.name AS artist_name,
      s.genius_thumbnail_url AS album_art_url,
      s.genre_tags,
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
    GROUP BY de.song_id, s.title, s.slug, a.name, s.genius_thumbnail_url, s.genre_tags
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
    t.title,
    t.slug,
    t.artist_name,
    t.album_art_url,
    t.genre_tags,
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
