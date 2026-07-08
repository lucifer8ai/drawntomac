-- Fix: Allow anon users to read profile display info for review lists
-- The profiles table was restricted to authenticated-only, which caused
-- embedded resource joins (profile:profiles(...)) in review queries to fail.
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles readable by all" ON public.profiles
  FOR SELECT USING (true);
