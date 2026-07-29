-- Onboarding flow: profile columns + artist selection RPC
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.get_onboarding_artists()
RETURNS TABLE(
  id UUID,
  name TEXT,
  image_url TEXT,
  song_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.name, a.image_url, COUNT(s.id) as song_count
  FROM public.artists a
  JOIN public.songs s ON s.artist_id = a.id
  GROUP BY a.id, a.name, a.image_url
  HAVING COUNT(s.id) >= 10
  ORDER BY a.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_onboarding_artists() TO authenticated;
