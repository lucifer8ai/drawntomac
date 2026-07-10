-- Migration: Update get_compatible_users with per-type breakdown counts

DROP FUNCTION IF EXISTS get_compatible_users(UUID);

CREATE OR REPLACE FUNCTION public.get_compatible_users(current_user_id UUID)
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
      COUNT(*) AS shared_songs,
      COUNT(*) FILTER (WHERE d2.type = 'heard') AS shared_heard,
      COUNT(*) FILTER (WHERE d2.type = 'like') AS shared_liked,
      COUNT(*) FILTER (WHERE d2.type = 'dislike') AS shared_disliked,
      COUNT(*) FILTER (WHERE d2.type = 'want') AS shared_want,
      COUNT(*) FILTER (WHERE d2.type = 'review') AS shared_reviewed
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
    s.shared_heard,
    s.shared_liked,
    s.shared_disliked,
    s.shared_want,
    s.shared_reviewed,
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
