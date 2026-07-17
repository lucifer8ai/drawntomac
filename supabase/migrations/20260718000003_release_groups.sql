-- Stage 4: Album Page — release_groups table + backfill + track metadata + updated album search

-- PL/pgSQL slugify helper (replaces JS slugify_base for migration use)
CREATE OR REPLACE FUNCTION public.slugify_base(input TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT trim(both '-' from lower(regexp_replace(
    regexp_replace(
      regexp_replace(input, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )));
$$;

-- Release groups table
CREATE TABLE public.release_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  musicbrainz_id TEXT UNIQUE NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  primary_type TEXT,
  image_url TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on songs for release_group_mbid lookups
CREATE INDEX idx_songs_release_group_mbid ON public.songs(release_group_mbid);

-- Backfill: create release_groups from existing songs.
-- UUID prefix on slug avoids collision. ON CONFLICT DO NOTHING for safety.
INSERT INTO public.release_groups (title, slug, musicbrainz_id, artist_id, image_url, release_date)
SELECT DISTINCT ON (s.release_group_mbid)
  COALESCE(NULLIF(s.title, ''), 'Unknown Album') AS title,
  public.slugify_base(COALESCE(s.release_group_mbid, s.title)) || '-' || left(gen_random_uuid()::text, 8) AS slug,
  s.release_group_mbid,
  s.artist_id,
  s.genius_thumbnail_url AS image_url,
  s.release_date
FROM public.songs s
WHERE s.release_group_mbid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.release_groups rg WHERE rg.musicbrainz_id = s.release_group_mbid
  )
ON CONFLICT (musicbrainz_id) DO NOTHING;

-- Add release_group_id FK to songs
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS release_group_id UUID REFERENCES public.release_groups(id) ON DELETE SET NULL;

-- Backfill release_group_id from release_groups mapping
UPDATE public.songs s
SET release_group_id = rg.id
FROM public.release_groups rg
WHERE s.release_group_mbid = rg.musicbrainz_id
  AND s.release_group_id IS NULL;

-- Add track_number for future enrichment
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS track_number INT;

-- RLS on release_groups
ALTER TABLE public.release_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "release_groups readable by all" ON public.release_groups FOR SELECT USING (true);
CREATE POLICY "authed insert release_groups" ON public.release_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authed update release_groups" ON public.release_groups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Rollback:
-- ALTER TABLE songs DROP COLUMN release_group_id;
-- ALTER TABLE songs DROP COLUMN track_number;
-- DROP TABLE release_groups;
-- DROP FUNCTION slugify_base;

-- Verification queries:
-- SELECT COUNT(*) FROM release_groups; -- should equal unique release_group_mbid from songs
-- SELECT COUNT(*) FROM songs WHERE release_group_id IS NOT NULL; -- should match songs with release_group_mbid

-- Stage 4: Replace search_local_albums to query release_groups directly
-- Must DROP first — return type changed (added slug column)
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
  similarity DOUBLE PRECISION,
  slug TEXT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    rg.musicbrainz_id AS release_group_mbid,
    rg.title,
    a.name AS artist_name,
    rg.image_url AS cover_url,
    sub.song_count,
    GREATEST(
      similarity(rg.title, p_query),
      COALESCE(similarity(a.name, p_query), 0)
    ) AS similarity,
    rg.slug
  FROM public.release_groups rg
  LEFT JOIN public.artists a ON a.id = rg.artist_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS song_count
    FROM public.songs s
    WHERE s.release_group_id = rg.id
  ) sub ON true
  WHERE rg.title ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%'
     OR (a.name IS NOT NULL AND a.name ILIKE '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_albums(TEXT, INT) TO anon, authenticated, service_role;

-- Album engagement RPC — requires release_group_id on songs (created above)
CREATE OR REPLACE FUNCTION public.get_album_engagement(
  p_release_group_id UUID
) RETURNS TABLE(
  total_hears BIGINT,
  total_likes BIGINT,
  total_reviews BIGINT,
  total_listeners BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  WHERE s.release_group_id = p_release_group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_album_engagement(UUID) TO anon, authenticated, service_role;
