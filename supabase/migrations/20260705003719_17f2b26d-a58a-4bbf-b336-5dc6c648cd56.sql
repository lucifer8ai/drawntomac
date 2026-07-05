
-- 1. Restrict private tables to owner only
DROP POLICY IF EXISTS "library readable by all" ON public.library_entries;
CREATE POLICY "users read own library" ON public.library_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "listens readable by all" ON public.listens;
CREATE POLICY "users read own listens" ON public.listens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Restrict social/profile tables to authenticated users
DROP POLICY IF EXISTS "profiles readable by all" ON public.profiles;
CREATE POLICY "profiles readable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "follows readable by all" ON public.follows;
CREATE POLICY "follows readable by authenticated" ON public.follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reviews readable by all" ON public.reviews;
CREATE POLICY "reviews readable by authenticated" ON public.reviews
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "comments readable by all" ON public.review_comments;
CREATE POLICY "comments readable by authenticated" ON public.review_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "likes readable by all" ON public.review_likes;
CREATE POLICY "likes readable by authenticated" ON public.review_likes
  FOR SELECT TO authenticated USING (true);

-- 3. Replace always-true write policies with authenticated-user checks
DROP POLICY IF EXISTS "authed insert artists" ON public.artists;
CREATE POLICY "authed insert artists" ON public.artists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authed update artists" ON public.artists;
CREATE POLICY "authed update artists" ON public.artists
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authed insert songs" ON public.songs;
CREATE POLICY "authed insert songs" ON public.songs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authed update songs" ON public.songs;
CREATE POLICY "authed update songs" ON public.songs
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Revoke direct EXECUTE on SECURITY DEFINER trigger helpers.
-- These functions are only meant to run via triggers (which use the table owner's rights),
-- not to be called directly by anon/authenticated over the API.
REVOKE EXECUTE ON FUNCTION public.notify_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_mutual_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
