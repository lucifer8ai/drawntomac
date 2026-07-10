-- Migration: Profile location sync trigger + Lucknow/Bhopal seed

-- Trigger: auto-populate city/country from location_id
CREATE OR REPLACE FUNCTION sync_profile_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.location_id IS NOT NULL THEN
    SELECT country, city INTO NEW.country, NEW.city
    FROM locations WHERE id = NEW.location_id;
  ELSE
    NEW.country := NULL;
    NEW.city := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_location ON profiles;
CREATE TRIGGER trg_sync_profile_location
  BEFORE INSERT OR UPDATE OF location_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_location();

-- Add Lucknow and Bhopal to India
INSERT INTO locations (country, city) VALUES
  ('India', 'Lucknow'),
  ('India', 'Bhopal')
ON CONFLICT (country, COALESCE(city, '')) DO NOTHING;

-- Backfill existing profiles that have location_id but null city/country
UPDATE profiles
SET city = l.city, country = l.country
FROM locations l
WHERE profiles.location_id = l.id
  AND profiles.city IS NULL;
