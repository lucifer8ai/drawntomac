
CREATE TABLE public.spotify_token_cache (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

GRANT ALL ON public.spotify_token_cache TO service_role;

ALTER TABLE public.spotify_token_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.spotify_token_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
