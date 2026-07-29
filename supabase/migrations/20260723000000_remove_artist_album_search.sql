-- Remove artist/album search and engagement RPCs (artist/album pages deleted)
DROP FUNCTION IF EXISTS public.search_local_artists(TEXT, INT);
DROP FUNCTION IF EXISTS public.search_local_albums(TEXT, INT);
DROP FUNCTION IF EXISTS public.get_artist_engagement(UUID);
DROP FUNCTION IF EXISTS public.get_album_engagement(UUID);
