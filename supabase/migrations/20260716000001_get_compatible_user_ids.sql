-- Migration: Add lightweight get_compatible_user_ids for social proof and other consumers
-- Avoids the full CTE chain when only user IDs are needed

CREATE OR REPLACE FUNCTION public.get_compatible_user_ids(current_user_id UUID)
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT d2.user_id
  FROM public.diary_entries d1
  JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
  WHERE d1.user_id = current_user_id
    AND d2.user_id != current_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = current_user_id AND blocked_id = d2.user_id)
         OR (blocker_id = d2.user_id AND blocked_id = current_user_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_compatible_user_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_compatible_user_ids(UUID) TO service_role;

-- Update get_trending_social_proof to use lightweight RPC instead of full get_compatible_users
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
  SELECT
    de.song_id,
    COUNT(DISTINCT de.user_id) AS match_count
  FROM public.diary_entries de
  WHERE de.user_id IN (SELECT user_id FROM public.get_compatible_user_ids(current_user_id))
    AND de.song_id = ANY(song_ids)
    AND de.type IN ('like', 'heard', 'review')
  GROUP BY de.song_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_trending_social_proof(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trending_social_proof(UUID, UUID[]) TO service_role;
