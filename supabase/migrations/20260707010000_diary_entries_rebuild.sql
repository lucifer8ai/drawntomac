-- Migration: Rebuild artists, songs, diary_entries for MusicBrainz/Genius
-- Drops: library_entries, listens, reviews, review_likes, review_comments, spotify_token_cache
-- Keeps: profiles, follows, blocks, dm_threads, dm_messages, notifications

-- 1. DROP OLD OBJECTS ------------------------------------------------

DROP TABLE IF EXISTS public.library_entries CASCADE;
DROP TABLE IF EXISTS public.listens CASCADE;
DROP TABLE IF EXISTS public.review_comments CASCADE;
DROP TABLE IF EXISTS public.review_likes CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.spotify_token_cache CASCADE;

-- Drop old notification triggers that reference possibly-missing tables
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_notify_like ON public.review_likes;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_notify_comment ON public.review_comments;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DROP FUNCTION IF EXISTS public.notify_like();
DROP FUNCTION IF EXISTS public.notify_comment();

-- Drop old songs/artists (will recreate)
ALTER TABLE IF EXISTS public.songs DROP CONSTRAINT IF EXISTS songs_artist_id_fkey;
DROP TABLE IF EXISTS public.songs CASCADE;
DROP TABLE IF EXISTS public.artists CASCADE;

-- 2. ARTISTS (recreate) ------------------------------------------------

CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  musicbrainz_id TEXT UNIQUE,
  genius_artist_id TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.artists TO anon, authenticated;
GRANT INSERT, UPDATE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artists readable by all" ON public.artists FOR SELECT USING (true);
CREATE POLICY "authed insert artists" ON public.artists FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authed update artists" ON public.artists FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SONGS (recreate) ---------------------------------------------------

CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,

  musicbrainz_id TEXT UNIQUE,
  genius_song_id TEXT,
  genius_thumbnail_url TEXT,
  preview_url TEXT,
  genre_tags TEXT[],
  credits JSONB,
  release_group_mbid TEXT,
  country TEXT,
  release_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.songs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs readable by all" ON public.songs FOR SELECT USING (true);
CREATE POLICY "authed insert songs" ON public.songs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authed update songs" ON public.songs FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 4. DIARY ENTRIES -----------------------------------------------------

-- Single table for all user-song interactions.
-- heard:   multiple per user+song (no UNIQUE), optional rating/body
-- want:    one per user+song (UNIQUE via partial index)
-- rating:  one per user+song (UNIQUE via partial index)
-- review:  one per user+song (UNIQUE via partial index), body required, 48h edit window

CREATE TABLE public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('heard', 'want', 'rating', 'review')),
  listened_on DATE,
  rating NUMERIC(2,1) CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 5.0)),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one want/rating/review per user+song; heard can repeat
CREATE UNIQUE INDEX diary_entries_unique_action
  ON public.diary_entries (user_id, song_id)
  WHERE type IN ('want', 'rating', 'review');

-- 48h edit lock for reviews: updated_at must be within 48h of created_at
-- This is enforced at the application layer, not a CHECK constraint,
-- because CHECK runs before the UPDATE sets the new updated_at value.

GRANT SELECT ON public.diary_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.diary_entries TO authenticated;
GRANT ALL ON public.diary_entries TO service_role;

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diary entries readable by all" ON public.diary_entries FOR SELECT USING (true);
CREATE POLICY "users insert own entry" ON public.diary_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own entry" ON public.diary_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own entry" ON public.diary_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_diary_entries_updated
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. REVIEW LIKES (repointed to diary_entries) --------------------------

CREATE TABLE public.review_likes (
  entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entry_id, user_id)
);

GRANT SELECT ON public.review_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.review_likes TO authenticated;
GRANT ALL ON public.review_likes TO service_role;

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by all" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "users insert own like" ON public.review_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own like" ON public.review_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. REVIEW COMMENTS (repointed to diary_entries) -----------------------

CREATE TABLE public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.review_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_comments TO authenticated;
GRANT ALL ON public.review_comments TO service_role;

ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable by all" ON public.review_comments FOR SELECT USING (true);
CREATE POLICY "users insert own comment" ON public.review_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own comment" ON public.review_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own comment" ON public.review_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 7. NOTIFICATION TRIGGERS (updated for diary_entries) ------------------

CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.diary_entries WHERE id = NEW.entry_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (owner, NEW.user_id, 'like', NEW.entry_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.review_likes FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.diary_entries WHERE id = NEW.entry_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (owner, NEW.user_id, 'comment', NEW.entry_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.review_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

REVOKE EXECUTE ON FUNCTION public.notify_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_comment() FROM PUBLIC, anon, authenticated;

-- 8. RATE LIMITER COUNTER TABLE -----------------------------------------

CREATE TABLE public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic rate-limit check + increment.
-- Returns true if the request is allowed (under limit), false if rate-limited.
-- Window in seconds. Typical: limit=1, window_sec=1 for MusicBrainz 1 req/sec.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  lim_key TEXT,
  lim_limit INTEGER DEFAULT 1,
  lim_window_sec INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row record;
BEGIN
  SELECT count, window_start INTO row
  FROM public.rate_limits
  WHERE key = lim_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (lim_key, 1, now());
    RETURN TRUE;
  END IF;

  IF row.window_start + (lim_window_sec || ' seconds')::INTERVAL < now() THEN
    UPDATE public.rate_limits
    SET count = 1, window_start = now()
    WHERE key = lim_key;
    RETURN TRUE;
  END IF;

  IF row.count >= lim_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits
  SET count = count + 1
  WHERE key = lim_key;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
