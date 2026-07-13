
-- Migrate music metadata source from Spotify to iTunes.

-- ARTISTS: spotify_id -> itunes_id
ALTER TABLE public.artists RENAME COLUMN spotify_id TO itunes_id;

-- SONGS: spotify_id -> itunes_id, spotify_url -> itunes_url
ALTER TABLE public.songs RENAME COLUMN spotify_id TO itunes_id;
ALTER TABLE public.songs RENAME COLUMN spotify_url TO itunes_url;

-- The iTunes Search / RSS APIs are public and require no OAuth client
-- credentials, so the Spotify app-token cache table is no longer needed.
DROP TABLE IF EXISTS public.spotify_token_cache;
