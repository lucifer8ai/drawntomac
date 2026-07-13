-- Split the single diary_entries_unique_action constraint into three
-- partial unique indexes so heard + like + review can coexist on the
-- same song, while keeping want/heard and like/dislike mutually exclusive.

DROP INDEX IF EXISTS public.diary_entries_unique_action;

CREATE UNIQUE INDEX diary_entries_want_heard_unique
  ON public.diary_entries (user_id, song_id)
  WHERE type IN ('want', 'heard');

CREATE UNIQUE INDEX diary_entries_like_dislike_unique
  ON public.diary_entries (user_id, song_id)
  WHERE type IN ('like', 'dislike');

CREATE UNIQUE INDEX diary_entries_review_unique
  ON public.diary_entries (user_id, song_id)
  WHERE type = 'review';
