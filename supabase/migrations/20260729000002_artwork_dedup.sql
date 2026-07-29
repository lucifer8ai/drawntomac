-- Artwork dedup: Album release groups share one image, non-Albums keep per-track artwork.
-- Introduces get_song_artwork_url() shared function and updates all RPCs.

-- Shared artwork resolution function: Album → RG image, else → song image
CREATE OR REPLACE FUNCTION public.get_song_artwork_url(
  p_genius_thumbnail_url TEXT,
  p_primary_type TEXT,
  p_release_group_image_url TEXT
) RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_primary_type = 'Album' AND p_release_group_image_url IS NOT NULL
    THEN p_release_group_image_url
    ELSE p_genius_thumbnail_url
  END;
$$;

-- ── RPC: get_trending_songs ──────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_trending_songs(INT);
CREATE OR REPLACE FUNCTION public.get_trending_songs(window_days INT DEFAULT 30)
RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT, genre_tags TEXT[],
  trending_score bigint, heard_count bigint, like_count bigint, dislike_count bigint, review_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    de.song_id, s.title, s.slug, a.name AS artist_name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
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
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE de.created_at >= now() - (window_days || ' days')::interval
    AND (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
  GROUP BY de.song_id, s.title, s.slug, a.name, s.genius_thumbnail_url, rg.primary_type, rg.image_url, s.genre_tags
  ORDER BY trending_score DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.get_trending_songs(INT) TO anon, authenticated, service_role;

-- ── RPC: get_for_you_songs ───────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_for_you_songs(UUID);
CREATE OR REPLACE FUNCTION public.get_for_you_songs(user_id UUID)
RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT, genre_tags TEXT[],
  trending_score bigint, heard_count bigint, like_count bigint, dislike_count bigint, review_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH compatible_users AS (
    SELECT d2.user_id AS cu_id
    FROM public.diary_entries d1
    JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
    WHERE d1.user_id = get_for_you_songs.user_id AND d2.user_id != get_for_you_songs.user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = get_for_you_songs.user_id AND blocked_id = d2.user_id)
           OR (blocker_id = d2.user_id AND blocked_id = get_for_you_songs.user_id)
      )
    GROUP BY d2.user_id
  ),
  trending AS (
    SELECT
      de.song_id, s.title, s.slug, a.name AS artist_name,
      public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
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
    LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
    WHERE de.created_at >= now() - interval '30 days'
      AND (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
    GROUP BY de.song_id, s.title, s.slug, a.name, s.genius_thumbnail_url, rg.primary_type, rg.image_url, s.genre_tags
  ),
  compatible_boost AS (
    SELECT de.song_id, COUNT(DISTINCT de.user_id) AS compatible_engagers
    FROM public.diary_entries de
    WHERE de.user_id IN (SELECT cu_id FROM compatible_users)
      AND de.created_at >= now() - interval '30 days'
    GROUP BY de.song_id
  )
  SELECT
    t.song_id, t.title, t.slug, t.artist_name, t.album_art_url, t.genre_tags,
    t.base_score + COALESCE(cb.compatible_engagers * 10, 0) AS trending_score,
    t.heard_count, t.like_count, t.dislike_count, t.review_count
  FROM trending t
  LEFT JOIN compatible_boost cb ON cb.song_id = t.song_id
  WHERE EXISTS (SELECT 1 FROM compatible_users)
  ORDER BY trending_score DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.get_for_you_songs(UUID) TO authenticated, service_role;

-- ── RPC: get_top_movers ─────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_top_movers(INT);
CREATE OR REPLACE FUNCTION public.get_top_movers(limit_count INT DEFAULT 5)
RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT,
  rank_delta bigint, current_score bigint, previous_score bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH current_window AS (
    SELECT de.song_id, COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS score
    FROM public.diary_entries de WHERE de.created_at >= now() - interval '7 days' GROUP BY de.song_id
  ),
  previous_window AS (
    SELECT de.song_id, COUNT(*) + COALESCE(SUM(CASE WHEN de.type = 'like' THEN 2 ELSE 0 END), 0)
      + COALESCE(SUM(CASE WHEN de.type = 'review' THEN 3 ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN de.type = 'dislike' THEN 1 ELSE 0 END), 0) AS score
    FROM public.diary_entries de WHERE de.created_at >= now() - interval '14 days' AND de.created_at < now() - interval '7 days'
    GROUP BY de.song_id
  ),
  current_ranked AS (SELECT cw.song_id, cw.score, ROW_NUMBER() OVER (ORDER BY cw.score DESC) AS rank FROM current_window cw),
  previous_ranked AS (SELECT pw.song_id, pw.score, ROW_NUMBER() OVER (ORDER BY pw.score DESC) AS rank FROM previous_window pw),
  climbers AS (
    SELECT cr.song_id, s.title, s.slug, a.name AS artist_name,
      public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
      (pr.rank - cr.rank)::bigint AS rank_delta, cr.score AS current_score, pr.score AS previous_score
    FROM current_ranked cr
    JOIN public.songs s ON s.id = cr.song_id
    LEFT JOIN public.artists a ON a.id = s.artist_id
    LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
    JOIN previous_ranked pr ON pr.song_id = cr.song_id
    WHERE pr.rank IS NOT NULL AND (pr.rank - cr.rank) > 0
      AND (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
  ),
  debuts AS (
    SELECT cr.song_id, s.title, s.slug, a.name AS artist_name,
      public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
      NULL::bigint AS rank_delta, cr.score AS current_score, NULL::bigint AS previous_score
    FROM current_ranked cr
    JOIN public.songs s ON s.id = cr.song_id
    LEFT JOIN public.artists a ON a.id = s.artist_id
    LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
    LEFT JOIN previous_ranked pr ON pr.song_id = cr.song_id
    WHERE pr.song_id IS NULL
      AND (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
  ),
  combined AS (SELECT * FROM climbers UNION ALL SELECT * FROM debuts)
  SELECT * FROM combined
  ORDER BY CASE WHEN rank_delta IS NULL THEN 1 ELSE 0 END, rank_delta DESC NULLS LAST
  LIMIT limit_count;
$$;
GRANT EXECUTE ON FUNCTION public.get_top_movers(INT) TO anon, authenticated, service_role;

-- ── RPC: get_recently_imported_songs ─────────────────────────────────────
DROP FUNCTION IF EXISTS get_recently_imported_songs();
CREATE OR REPLACE FUNCTION public.get_recently_imported_songs()
RETURNS TABLE(song_id UUID, title TEXT, slug TEXT, artist_name TEXT, genius_thumbnail_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id AS song_id, s.title, s.slug, a.name AS artist_name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS genius_thumbnail_url
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
  ORDER BY s.created_at DESC
  LIMIT 10;
$$;
GRANT EXECUTE ON FUNCTION public.get_recently_imported_songs() TO anon, authenticated, service_role;

-- ── RPC: get_connecting_songs ────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_connecting_songs(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_connecting_songs(current_user_id UUID, limit_count INT DEFAULT 5)
RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT, source_display_name TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH top_compat AS (
    SELECT user_id FROM public.get_compatible_users(current_user_id, 'composite', 0) LIMIT 3
  ),
  user_songs AS (SELECT DISTINCT song_id FROM public.diary_entries WHERE user_id = current_user_id),
  compat_entries AS (
    SELECT de.song_id, de.user_id, p.display_name
    FROM public.diary_entries de
    JOIN public.profiles p ON p.id = de.user_id
    WHERE de.user_id IN (SELECT user_id FROM top_compat)
      AND de.song_id NOT IN (SELECT song_id FROM user_songs)
  )
  SELECT s.id AS song_id, s.title, s.slug, a.name AS artist_name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
    ce.display_name AS source_display_name
  FROM compat_entries ce
  JOIN public.songs s ON s.id = ce.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
  ORDER BY random()
  LIMIT limit_count;
$$;
GRANT EXECUTE ON FUNCTION public.get_connecting_songs(UUID, INT) TO authenticated, service_role;

-- ── RPC: get_connecting_song_details ─────────────────────────────────────
DROP FUNCTION IF EXISTS get_connecting_song_details(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_connecting_song_details(viewer_id UUID, target_id UUID)
RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT,
  viewer_types TEXT[], target_types TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id AS song_id, s.title, s.slug, a.name AS artist_name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
    array_agg(DISTINCT d1.type ORDER BY d1.type) FILTER (WHERE d1.user_id = viewer_id) AS viewer_types,
    array_agg(DISTINCT d2.type ORDER BY d2.type) FILTER (WHERE d2.user_id = target_id) AS target_types
  FROM public.diary_entries d1
  JOIN public.diary_entries d2 ON d2.song_id = d1.song_id
  JOIN public.songs s ON s.id = d1.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE d1.user_id = viewer_id AND d2.user_id = target_id
  GROUP BY s.id, s.title, s.slug, a.name, s.genius_thumbnail_url, rg.primary_type, rg.image_url
  ORDER BY s.title;
$$;
GRANT EXECUTE ON FUNCTION public.get_connecting_song_details(UUID, UUID) TO authenticated, service_role;

-- ── RPC: get_feed ────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_feed(UUID, TIMESTAMPTZ, INT);
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id UUID, p_cursor TIMESTAMPTZ DEFAULT NULL, p_limit INT DEFAULT 25
)
RETURNS TABLE(
  entry_id UUID, user_id UUID, type TEXT, body TEXT, created_at TIMESTAMPTZ,
  song_id UUID, song_title TEXT, song_slug TEXT, artist_name TEXT, album_art_url TEXT,
  username TEXT, display_name TEXT, avatar_url TEXT
)
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  following_ids UUID[]; blocked_ids UUID[];
BEGIN
  SELECT ARRAY_AGG(following_id) INTO following_ids FROM public.follows WHERE follower_id = p_user_id;
  IF following_ids IS NULL THEN RETURN; END IF;
  SELECT ARRAY(SELECT blocked_id FROM public.blocks WHERE blocker_id = p_user_id UNION SELECT blocker_id FROM public.blocks WHERE blocked_id = p_user_id) INTO blocked_ids;
  IF blocked_ids IS NOT NULL THEN
    following_ids := ARRAY(SELECT unnest(following_ids) EXCEPT SELECT unnest(blocked_ids));
  END IF;
  RETURN QUERY
  SELECT de.id, de.user_id, de.type, de.body, de.created_at, de.song_id, s.title, s.slug, a.name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url),
    p.username, p.display_name, p.avatar_url
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  LEFT JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  JOIN public.profiles p ON p.id = de.user_id
  WHERE de.user_id = ANY(following_ids)
    AND de.type IN ('heard', 'like', 'dislike', 'review', 'want')
    AND (p_cursor IS NULL OR de.created_at < p_cursor)
  ORDER BY de.created_at DESC
  LIMIT p_limit + 1;
END;
$$;

-- ── RPC: search_local_songs ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.search_local_songs(TEXT, INT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.search_local_songs(
  p_query TEXT, p_limit INT DEFAULT 8, p_language TEXT DEFAULT NULL, p_era TEXT DEFAULT NULL
) RETURNS TABLE(song_id UUID, title TEXT, slug TEXT, artist_name TEXT, thumbnail_url TEXT, musicbrainz_id TEXT, similarity DOUBLE PRECISION)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN RETURN; END IF;
  RETURN QUERY
  SELECT s.id AS song_id, s.title, s.slug, a.name AS artist_name,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS thumbnail_url,
    s.musicbrainz_id,
    GREATEST(similarity(s.title, p_query), similarity(a.name, p_query)) AS similarity
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE (s.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'))
    AND (p_language IS NULL OR s.language @> ARRAY[p_language]::text[])
    AND (p_era IS NULL OR s.era = p_era)
  ORDER BY similarity DESC LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_local_songs(TEXT, INT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ── RPC: browse_canon_songs ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.browse_canon_songs(TEXT, TEXT, TEXT, TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.browse_canon_songs(
  p_language TEXT DEFAULT NULL, p_era TEXT DEFAULT NULL, p_genre TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'trending', p_limit INT DEFAULT 50, p_offset INT DEFAULT 0
) RETURNS TABLE(
  song_id UUID, title TEXT, slug TEXT, artist_name TEXT, album_art_url TEXT, genre_tags TEXT[],
  language TEXT[], era TEXT, heard_count BIGINT, like_count BIGINT, review_count BIGINT, total_rows BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_limit > 100 THEN p_limit := 100; END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT s.id, s.title, s.slug, a.name AS artist_name,
      public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url) AS album_art_url,
      s.genre_tags, s.language, s.era,
      COUNT(*) FILTER (WHERE de.type = 'heard') AS heard_count,
      COUNT(*) FILTER (WHERE de.type = 'like') AS like_count,
      COUNT(*) FILTER (WHERE de.type = 'review') AS review_count,
      COUNT(*) OVER () AS total_rows
    FROM public.songs s
    LEFT JOIN public.artists a ON a.id = s.artist_id
    LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
    LEFT JOIN public.diary_entries de ON de.song_id = s.id
    WHERE s.source_type = 'canon'
      AND (p_language IS NULL OR s.language @> ARRAY[p_language]::text[])
      AND (p_era IS NULL OR s.era = p_era)
      AND (p_genre IS NULL OR s.genre_tags @> ARRAY[p_genre]::text[])
      AND (a.artist_countries IS NULL OR cardinality(a.artist_countries) = 0 OR a.artist_countries && ARRAY['IN','US','GB','AU','CA','XW','PK']::text[])
    GROUP BY s.id, s.title, s.slug, a.name, s.genius_thumbnail_url, rg.primary_type, rg.image_url, s.genre_tags, s.language, s.era
  )
  SELECT f.id, f.title, f.slug, f.artist_name, f.album_art_url, f.genre_tags, f.language, f.era, f.heard_count, f.like_count, f.review_count, f.total_rows
  FROM filtered f
  ORDER BY CASE WHEN p_sort = 'trending' THEN f.heard_count + f.like_count + f.review_count END DESC NULLS LAST, f.title ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.browse_canon_songs(TEXT, TEXT, TEXT, TEXT, INT, INT) TO anon, authenticated, service_role;

-- ── RPC: get_artist_discography ─────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_artist_discography(UUID);
CREATE OR REPLACE FUNCTION public.get_artist_discography(p_artist_id UUID)
RETURNS TABLE(
  id UUID, title TEXT, slug TEXT,
  primary_artist_name TEXT, primary_artist_slug TEXT, primary_artist_image_url TEXT,
  role TEXT, image_url TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.title, s.slug, a.name, a.slug, a.image_url, 'lead' AS role,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url), s.created_at
  FROM public.songs s
  JOIN public.artists a ON a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE s.artist_id = p_artist_id
  UNION ALL
  SELECT s.id, s.title, s.slug, lead_a.name, lead_a.slug, lead_a.image_url, 'featured' AS role,
    public.get_song_artwork_url(s.genius_thumbnail_url, rg.primary_type, rg.image_url), s.created_at
  FROM public.song_artists sa
  JOIN public.songs s ON s.id = sa.song_id
  JOIN public.artists lead_a ON lead_a.id = s.artist_id
  LEFT JOIN public.release_groups rg ON rg.id = s.release_group_id
  WHERE sa.artist_id = p_artist_id AND sa.position >= 1 AND s.artist_id != p_artist_id
  ORDER BY created_at DESC LIMIT 200;
$$;
GRANT EXECUTE ON FUNCTION public.get_artist_discography(UUID) TO anon, authenticated, service_role;

-- ── RPC: search_local_albums (uses release_groups directly) ─────────────
DROP FUNCTION IF EXISTS public.search_local_albums(TEXT, INT);
CREATE OR REPLACE FUNCTION public.search_local_albums(p_query TEXT, p_limit INT DEFAULT 3)
RETURNS TABLE(release_group_mbid TEXT, title TEXT, artist_name TEXT, cover_url TEXT, song_count BIGINT, similarity DOUBLE PRECISION)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN RETURN; END IF;
  RETURN QUERY
  SELECT rg.musicbrainz_id AS release_group_mbid, rg.title, a.name AS artist_name,
    rg.image_url AS cover_url, sub.song_count,
    GREATEST(similarity(rg.title, p_query), COALESCE(similarity(a.name, p_query), 0)) AS similarity
  FROM public.release_groups rg
  LEFT JOIN public.artists a ON a.id = rg.artist_id
  LEFT JOIN LATERAL (SELECT COUNT(*) AS song_count FROM public.songs s WHERE s.release_group_id = rg.id) sub ON true
  WHERE rg.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
  ORDER BY similarity DESC LIMIT p_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_local_albums(TEXT, INT) TO anon, authenticated, service_role;

-- ── SQL function tests ───────────────────────────────────────────────────
DO $$
DECLARE
  result TEXT;
BEGIN
  result := public.get_song_artwork_url('https://song.jpg', 'Album', 'https://rg.jpg');
  ASSERT result = 'https://rg.jpg', 'Album should return RG image';

  result := public.get_song_artwork_url('https://song.jpg', 'EP', 'https://ep.jpg');
  ASSERT result = 'https://song.jpg', 'EP should return song image';

  result := public.get_song_artwork_url('https://song.jpg', 'Album', NULL);
  ASSERT result = 'https://song.jpg', 'Album with NULL RG image should fall back to song';

  result := public.get_song_artwork_url('https://song.jpg', NULL, 'https://rg.jpg');
  ASSERT result = 'https://song.jpg', 'NULL primary_type should return song image';

  result := public.get_song_artwork_url(NULL, NULL, NULL);
  ASSERT result IS NULL, 'All NULL should return NULL';
END $$;
