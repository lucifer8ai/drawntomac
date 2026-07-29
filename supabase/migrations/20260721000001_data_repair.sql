-- Data repair: fix corrupted artist names and add extraction helper

-- Extract likely real name from collaboration strings
CREATE OR REPLACE FUNCTION public.extract_primary_artist_name(collab_name TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(
    regexp_replace(collab_name, '\s*[&×]\s*.*$', ''),
    '\s+(feat\.?|ft\.?|vs\.?|with|prod\.?|pres\.?|co-starring|,).*$', '', 'i'
  );
$$;

-- Flag songs whose primary artist name is a collaboration string
UPDATE public.songs SET needs_repair = TRUE
WHERE artist_id IN (
  SELECT a.id FROM public.artists a
  INNER JOIN public.song_artists sa ON sa.artist_id = a.id AND sa.position = 0
  WHERE a.name ~ '(&|×|\sfeat\.?\s|\sft\.?\s|\bvs\.?\b|\bwith\b|\bprod\.?\b)'
);

-- Repair artist names: extract first artist from collaboration strings
-- Only fix artists that are position-0 in at least one song (were corrupted as primary)
UPDATE public.artists
SET name = public.extract_primary_artist_name(name)
WHERE id IN (
  SELECT a.id FROM public.artists a
  INNER JOIN public.song_artists sa ON sa.artist_id = a.id AND sa.position = 0
  WHERE a.name ~ '(&|×|\sfeat\.?\s|\sft\.?\s|\bvs\.?\b|\bwith\b|\bprod\.?\b)'
)
AND public.extract_primary_artist_name(name) != name;
