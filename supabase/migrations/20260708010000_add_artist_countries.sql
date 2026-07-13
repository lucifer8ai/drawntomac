ALTER TABLE artists ADD COLUMN IF NOT EXISTS artist_countries TEXT[] DEFAULT '{}';
