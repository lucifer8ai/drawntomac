-- Backfill: copy artwork from child songs to release_groups where image_url is NULL
-- Songs within the same album already have artwork — the RG just lost it during import.

UPDATE release_groups rg
SET image_url = (
  SELECT s.genius_thumbnail_url
  FROM songs s
  WHERE s.release_group_id = rg.id
    AND s.genius_thumbnail_url IS NOT NULL
  ORDER BY s.release_date DESC NULLS LAST
  LIMIT 1
)
WHERE rg.image_url IS NULL
  AND EXISTS (
    SELECT 1 FROM songs s
    WHERE s.release_group_id = rg.id
      AND s.genius_thumbnail_url IS NOT NULL
  );

-- Verification: should return 0
-- SELECT COUNT(*) FROM release_groups rg
-- WHERE rg.image_url IS NULL
--   AND EXISTS (SELECT 1 FROM songs s WHERE s.release_group_id = rg.id AND s.genius_thumbnail_url IS NOT NULL);
