-- Migration: Add guardrail comments to compatibility functions
-- Prevents future maintainers from "simplifying" COUNT(DISTINCT) back to COUNT(*)
-- which would reintroduce the N×M cross-product inflation bug.

-- Guardrail for get_compatible_users
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
  /*
   * ⚠️ GUARDRAIL: NEVER use bare COUNT(*) here.
   *
   * diary_entries allows multiple types per song per user
   * (e.g., both 'heard' AND 'like' on the same song_id).
   * The self-join ON song_id produces N×M rows per shared song.
   * COUNT(*) counts JOIN rows, not distinct songs — use
   * COUNT(DISTINCT song_id) for EVERY aggregate below.
   *
   * A user with heard+like on "Bohemian Rhapsody" matched
   * against another user with heard on the same song produces
   * 2×1=2 JOIN rows. COUNT(*) = 2, but the truth is 1 song.
   */
  WITH shared AS (
    SELECT
      d2.user_id,
      COUNT(DISTINCT d1.song_id) AS shared_songs,
      COUNT(DISTINCT d2.song_id) FILTER (WHERE d2.type = 'heard') AS shared_heard,
      COUNT(DISTINCT d2.song_id) FILTER (WHERE d2.type = 'like') AS shared_liked,
      COUNT(DISTINCT d2.song_id) FILTER (WHERE d2.type = 'dislike') AS shared_disliked,
      COUNT(DISTINCT d2.song_id) FILTER (WHERE d2.type = 'want') AS shared_want,
      COUNT(DISTINCT d2.song_id) FILTER (WHERE d2.type = 'review') AS shared_reviewed,
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


-- Guardrail for get_user_compatibility
CREATE OR REPLACE FUNCTION get_user_compatibility(viewer_id UUID, target_id UUID)
RETURNS TABLE(
  shared_songs bigint,
  shared_heard bigint,
  shared_liked bigint,
  shared_disliked bigint,
  shared_reviewed bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  /*
   * ⚠️ GUARDRAIL: NEVER use bare COUNT(*) here.
   *
   * diary_entries allows multiple types per song per user.
   * The self-join ON song_id produces N×M rows per shared song.
   * The overlapping CTE uses SELECT DISTINCT song_id, type to
   * deduplicate BEFORE counting. Do NOT remove DISTINCT from the
   * CTE or switch to COUNT(*) without DISTINCT on song_id.
   */
  WITH overlapping AS (
    SELECT DISTINCT d2.song_id, d2.type
    FROM diary_entries d1
    JOIN diary_entries d2 ON d2.song_id = d1.song_id
    WHERE d1.user_id = viewer_id
      AND d2.user_id = target_id
  )
  SELECT
    COUNT(DISTINCT song_id)::bigint AS shared_songs,
    COUNT(*) FILTER (WHERE type = 'heard')::bigint AS shared_heard,
    COUNT(*) FILTER (WHERE type = 'like')::bigint AS shared_liked,
    COUNT(*) FILTER (WHERE type = 'dislike')::bigint AS shared_disliked,
    COUNT(*) FILTER (WHERE type = 'review')::bigint AS shared_reviewed
  FROM overlapping;
$$;

GRANT EXECUTE ON FUNCTION get_user_compatibility(UUID, UUID) TO authenticated;
