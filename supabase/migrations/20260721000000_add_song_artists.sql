-- Add song_artists junction table for multi-artist song support
-- songs.artist_id stays as denormalized cache pointing to position-0 artist

CREATE TABLE public.song_artists (
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  join_phrase TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (song_id, artist_id)
);

-- Migrate existing data: each song gets its current artist as position 0
INSERT INTO public.song_artists (song_id, artist_id, position, join_phrase)
SELECT id, artist_id, 0, ''
FROM public.songs
WHERE artist_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX idx_song_artists_song ON public.song_artists(song_id);
CREATE INDEX idx_song_artists_artist ON public.song_artists(artist_id);
CREATE INDEX idx_song_artists_position ON public.song_artists(song_id, position);

-- Add repair tracking column
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS needs_repair BOOLEAN NOT NULL DEFAULT FALSE;
