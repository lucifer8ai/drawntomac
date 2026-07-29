-- Backfill primary_type for existing release groups
-- Heuristic: release groups with >= 5 tracks are likely Albums.
-- Non-Albums (EPs, Singles, Remixes) typically have 1-4 tracks.

UPDATE public.release_groups rg
SET primary_type = 'Album'
WHERE rg.primary_type IS NULL
  AND EXISTS (
    SELECT 1 FROM public.songs s
    WHERE s.release_group_id = rg.id
    HAVING COUNT(*) >= 5
  );
