-- Migration: Add discover indexes for trending and compatibility queries

-- Time-range scan for 30-day trending query
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON public.diary_entries (created_at);

-- Self-join for compatibility query (song_id leading, since the join matches on d2.song_id = d1.song_id)
CREATE INDEX IF NOT EXISTS idx_diary_entries_song_user ON public.diary_entries (song_id, user_id);
