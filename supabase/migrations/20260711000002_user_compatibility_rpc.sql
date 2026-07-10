-- Migration: User compatibility RPC with per-type breakdown

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
  WITH overlapping AS (
    SELECT d2.type
    FROM diary_entries d1
    JOIN diary_entries d2 ON d2.song_id = d1.song_id
    WHERE d1.user_id = viewer_id
      AND d2.user_id = target_id
  )
  SELECT
    COUNT(*)::bigint AS shared_songs,
    COUNT(*) FILTER (WHERE type = 'heard')::bigint AS shared_heard,
    COUNT(*) FILTER (WHERE type = 'like')::bigint AS shared_liked,
    COUNT(*) FILTER (WHERE type = 'dislike')::bigint AS shared_disliked,
    COUNT(*) FILTER (WHERE type = 'review')::bigint AS shared_reviewed
  FROM overlapping;
$$;

GRANT EXECUTE ON FUNCTION get_user_compatibility(UUID, UUID) TO authenticated;
