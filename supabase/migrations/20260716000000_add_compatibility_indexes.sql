-- Migration: Add missing indexes for compatibility queries

-- Driving side of compatibility self-join (WHERE d1.user_id = current_user_id)
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_song ON public.diary_entries (user_id, song_id);

-- Block exclusion check in get_compatible_users NOT EXISTS subquery
CREATE INDEX IF NOT EXISTS idx_blocks_lookup ON public.blocks (blocker_id, blocked_id);
