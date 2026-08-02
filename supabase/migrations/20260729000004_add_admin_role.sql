-- Migration: Add admin role support + tighten artist/song/release_group RLS
-- Phase 1 of admin content editing feature

-- 1. ADD is_admin TO PROFILES ------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. TIGHTEN RLS ON ARTISTS ---------------------------------------------
-- Currently: any authenticated user can INSERT/UPDATE. Fix: SELECT only.

DROP POLICY IF EXISTS "authed insert artists" ON public.artists;
DROP POLICY IF EXISTS "authed update artists" ON public.artists;

REVOKE INSERT, UPDATE ON public.artists FROM authenticated;

-- 3. TIGHTEN RLS ON SONGS -----------------------------------------------
-- Same pattern: revoke write, keep SELECT (get_feed is SECURITY INVOKER)

DROP POLICY IF EXISTS "authed insert songs" ON public.songs;
DROP POLICY IF EXISTS "authed update songs" ON public.songs;

REVOKE INSERT, UPDATE ON public.songs FROM authenticated;

-- 4. TIGHTEN RLS ON RELEASE_GROUPS --------------------------------------

DROP POLICY IF EXISTS "authed insert release_groups" ON public.release_groups;
DROP POLICY IF EXISTS "authed update release_groups" ON public.release_groups;

REVOKE INSERT, UPDATE ON public.release_groups FROM authenticated;

-- 5. SET FIRST ADMIN ----------------------------------------------------

UPDATE public.profiles SET is_admin = true WHERE id = (
  SELECT id FROM auth.users WHERE email = 'yrkgkp1@gmail.com'
);
