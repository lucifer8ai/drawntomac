-- Phase 1: Add like/dislike to diary_entries type CHECK (backward compatible)
-- This keeps 'rating' so existing code continues to work.
-- Phase 2 (after code deploy) will remove 'rating' and drop the column.

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'diary_entries'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%heard%want%rating%review%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.diary_entries DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.diary_entries
  ADD CONSTRAINT diary_entries_type_check
  CHECK (type IN ('heard', 'want', 'rating', 'like', 'dislike', 'review'));
