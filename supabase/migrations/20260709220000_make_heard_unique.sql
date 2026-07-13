-- Make 'heard' one-per-user-per-song (log once, toggle off to unlog)
-- Previously: heard could repeat (multiple listens), now: binary toggle

-- Drop old partial index (excludes 'heard')
DROP INDEX IF EXISTS public.diary_entries_unique_action;

-- Recreate with 'heard' included
CREATE UNIQUE INDEX diary_entries_unique_action
  ON public.diary_entries (user_id, song_id)
  WHERE type IN ('want', 'like', 'dislike', 'review', 'heard');

-- Clean up duplicate heard entries: keep the latest, delete older ones
DELETE FROM public.diary_entries
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, song_id, type
        ORDER BY created_at DESC
      ) AS rn
    FROM public.diary_entries
    WHERE type = 'heard'
  ) sub
  WHERE rn > 1
);

-- Drop listened_on column — no longer needed for binary toggle
ALTER TABLE public.diary_entries DROP COLUMN IF EXISTS listened_on;
