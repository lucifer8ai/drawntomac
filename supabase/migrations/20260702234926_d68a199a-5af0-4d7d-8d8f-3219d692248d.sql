
-- Updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,20}$'),
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  city TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "users delete own profile" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; candidate TEXT; i INT := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'user'), '[^a-z0-9_]', '', 'g'));
  IF length(base) < 3 THEN base := 'user' || substr(NEW.id::text,1,6); END IF;
  IF length(base) > 20 THEN base := substr(base,1,20); END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    i := i + 1;
    candidate := substr(base,1,20-length(i::text)) || i::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, candidate, coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name'), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ARTISTS (public)
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  spotify_id TEXT UNIQUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artists TO anon, authenticated;
GRANT INSERT, UPDATE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artists readable by all" ON public.artists FOR SELECT USING (true);
CREATE POLICY "authed insert artists" ON public.artists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authed update artists" ON public.artists FOR UPDATE TO authenticated USING (true);

-- SONGS
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  spotify_id TEXT UNIQUE,
  cover_url TEXT,
  preview_url TEXT,
  spotify_url TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.songs TO anon, authenticated;
GRANT INSERT, UPDATE ON public.songs TO authenticated;
GRANT ALL ON public.songs TO service_role;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "songs readable by all" ON public.songs FOR SELECT USING (true);
CREATE POLICY "authed insert songs" ON public.songs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authed update songs" ON public.songs FOR UPDATE TO authenticated USING (true);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  rating NUMERIC(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0 AND (rating * 2) = floor(rating * 2)),
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews readable by all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "users insert own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own review" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own review" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LISTENS (diary)
CREATE TABLE public.listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  listened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  rating NUMERIC(2,1) CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5.0 AND (rating * 2) = floor(rating * 2))),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listens TO authenticated;
GRANT ALL ON public.listens TO service_role;
ALTER TABLE public.listens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "listens readable by all" ON public.listens FOR SELECT USING (true);
CREATE POLICY "users insert own listen" ON public.listens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own listen" ON public.listens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own listen" ON public.listens FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- LIBRARY ENTRIES
CREATE TABLE public.library_entries (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('heard','want')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, song_id)
);
GRANT SELECT ON public.library_entries TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.library_entries TO authenticated;
GRANT ALL ON public.library_entries TO service_role;
ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library readable by all" ON public.library_entries FOR SELECT USING (true);
CREATE POLICY "users manage own library" ON public.library_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FOLLOWS
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT ON public.follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable by all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "users create own follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "users delete own follow" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- REVIEW LIKES
CREATE TABLE public.review_likes (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);
GRANT SELECT ON public.review_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.review_likes TO authenticated;
GRANT ALL ON public.review_likes TO service_role;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable by all" ON public.review_likes FOR SELECT USING (true);
CREATE POLICY "users like" ON public.review_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users unlike" ON public.review_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REVIEW COMMENTS
CREATE TABLE public.review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.review_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.review_comments TO authenticated;
GRANT ALL ON public.review_comments TO service_role;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable by all" ON public.review_comments FOR SELECT USING (true);
CREATE POLICY "users insert own comment" ON public.review_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own comment" ON public.review_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own comment" ON public.review_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BLOCKS
CREATE TABLE public.blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own blocks" ON public.blocks FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "users create own block" ON public.blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "users delete own block" ON public.blocks FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow','like','comment','message')),
  entity_id UUID,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own notifs" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users update own notifs" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own notifs" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- DM THREADS (mutual follow only, enforced by trigger)
CREATE TABLE public.dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_one_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_two_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_one_id < user_two_id),
  UNIQUE (user_one_id, user_two_id)
);
GRANT SELECT, INSERT ON public.dm_threads TO authenticated;
GRANT ALL ON public.dm_threads TO service_role;
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read thread" ON public.dm_threads FOR SELECT TO authenticated USING (auth.uid() IN (user_one_id, user_two_id));
CREATE POLICY "participants create thread" ON public.dm_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (user_one_id, user_two_id));

CREATE OR REPLACE FUNCTION public.enforce_mutual_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = NEW.user_one_id AND following_id = NEW.user_two_id)
  OR NOT EXISTS (SELECT 1 FROM public.follows WHERE follower_id = NEW.user_two_id AND following_id = NEW.user_one_id) THEN
    RAISE EXCEPTION 'DM threads require mutual follow';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_dm_mutual_follow BEFORE INSERT ON public.dm_threads FOR EACH ROW EXECUTE FUNCTION public.enforce_mutual_follow();

-- DM MESSAGES
CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read messages" ON public.dm_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_one_id, t.user_two_id)));
CREATE POLICY "sender writes messages" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_one_id, t.user_two_id)));
CREATE POLICY "participants mark read" ON public.dm_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_one_id, t.user_two_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = thread_id AND auth.uid() IN (t.user_one_id, t.user_two_id)));

-- NOTIFICATION TRIGGERS
CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.notify_follow();

CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.reviews WHERE id = NEW.review_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (owner, NEW.user_id, 'like', NEW.review_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_like AFTER INSERT ON public.review_likes FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner UUID;
BEGIN
  SELECT user_id INTO owner FROM public.reviews WHERE id = NEW.review_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (owner, NEW.user_id, 'comment', NEW.review_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.review_comments FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID;
BEGIN
  SELECT CASE WHEN t.user_one_id = NEW.sender_id THEN t.user_two_id ELSE t.user_one_id END
  INTO recipient FROM public.dm_threads t WHERE t.id = NEW.thread_id;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, actor_id, type, entity_id)
    VALUES (recipient, NEW.sender_id, 'message', NEW.thread_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_notify_message AFTER INSERT ON public.dm_messages FOR EACH ROW EXECUTE FUNCTION public.notify_message();
