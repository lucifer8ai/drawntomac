-- Phase 1: Add get_feed RPC for the social feed feature.
-- No schema changes, no type constraint changes.

CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id UUID,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_limit INT DEFAULT 25
)
RETURNS TABLE(
  entry_id UUID,
  user_id UUID,
  type TEXT,
  body TEXT,
  created_at TIMESTAMPTZ,
  song_id UUID,
  song_title TEXT,
  song_slug TEXT,
  artist_name TEXT,
  album_art_url TEXT,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  following_ids UUID[];
  blocked_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(following_id)
  INTO following_ids
  FROM public.follows
  WHERE follower_id = p_user_id;

  IF following_ids IS NULL THEN
    RETURN;
  END IF;

  SELECT ARRAY(
    SELECT blocked_id FROM public.blocks WHERE blocker_id = p_user_id
    UNION
    SELECT blocker_id FROM public.blocks WHERE blocked_id = p_user_id
  )
  INTO blocked_ids;

  IF blocked_ids IS NOT NULL THEN
    following_ids := ARRAY(
      SELECT unnest(following_ids)
      EXCEPT
      SELECT unnest(blocked_ids)
    );
  END IF;

  RETURN QUERY
  SELECT
    de.id,
    de.user_id,
    de.type,
    de.body,
    de.created_at,
    de.song_id,
    s.title,
    s.slug,
    a.name,
    s.genius_thumbnail_url,
    p.username,
    p.display_name,
    p.avatar_url
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  JOIN public.profiles p ON p.id = de.user_id
  WHERE de.user_id = ANY(following_ids)
    AND de.type IN ('heard', 'like', 'dislike', 'review', 'want')
    AND (p_cursor IS NULL OR de.created_at < p_cursor)
  ORDER BY de.created_at DESC
  LIMIT p_limit + 1;
END;
$$;
