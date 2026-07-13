const GENIUS_BASE = "https://api.genius.com";

type GeniusHitResult = {
  id: number;
  song_art_image_thumbnail_url?: string;
  header_image_thumbnail_url?: string;
  header_image_url?: string;
  song_art_image_url?: string;
  primary_artist?: {
    id: number;
    name?: string;
    image_url?: string;
    header_image_url?: string;
  };
};

type ArtworkResult = {
  thumbnailUrl: string | null;
  geniusSongId: string | null;
  geniusArtistId: string | null;
  artistImageUrl: string | null;
};

function extractArtwork(hits: GeniusHitResult[]): ArtworkResult {
  for (const r of hits) {
    const thumb =
      r.song_art_image_thumbnail_url ??
      r.header_image_thumbnail_url ??
      r.song_art_image_url ??
      r.header_image_url ??
      null;
    if (thumb) {
      const artist = r.primary_artist;
      return {
        thumbnailUrl: thumb,
        geniusSongId: String(r.id),
        geniusArtistId: artist?.id ? String(artist.id) : null,
        artistImageUrl: artist?.image_url ?? artist?.header_image_url ?? null,
      };
    }
  }
  return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };
}

function cleanArtistName(name: string): string {
  return name
    .replace(/\s*[&＋]\s*.+$/, "")
    .replace(/\s*(?:feat\.?|ft\.?|vs\.?|x)\s*.+$/i, "")
    .trim();
}

async function fetchGeniusSearch(token: string, query: string): Promise<GeniusHitResult[]> {
  const res = await fetch(`${GENIUS_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    response?: { hits?: Array<{ result: GeniusHitResult }> };
  };
  return (data.response?.hits ?? []).map((h) => h.result);
}

/**
 * Search Genius for a song and return artwork + artist metadata.
 */
export async function searchGeniusArtwork(
  artistName: string,
  songTitle: string,
): Promise<ArtworkResult> {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    console.warn("[genius] GENIUS_ACCESS_TOKEN not set — skipping Genius fallback");
    return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };
  }

  const empty = { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null, artistImageUrl: null };

  try {
    // Try 1: full artist name from MusicBrainz
    let results = await fetchGeniusSearch(token, `${songTitle} ${artistName}`);
    let artwork = extractArtwork(results);
    if (artwork.thumbnailUrl) return artwork;

    // Try 2: strip collab/featuring artists
    const cleaned = cleanArtistName(artistName);
    if (cleaned !== artistName && cleaned.length > 0) {
      results = await fetchGeniusSearch(token, `${songTitle} ${cleaned}`);
      artwork = extractArtwork(results);
      if (artwork.thumbnailUrl) return artwork;
    }

    // Try 3: song title only
    results = await fetchGeniusSearch(token, songTitle);
    artwork = extractArtwork(results);
    if (artwork.thumbnailUrl) return artwork;

    return empty;
  } catch {
    return empty;
  }
}
