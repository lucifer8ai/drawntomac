const GENIUS_BASE = "https://api.genius.com";

/**
 * Search Genius for a song and return the best-match thumbnail URL.
 * Used as a fallback when Cover Art Archive has no artwork.
 */
export async function searchGeniusArtwork(
  artistName: string,
  songTitle: string,
): Promise<{ thumbnailUrl: string | null; geniusSongId: string | null; geniusArtistId: string | null }> {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  if (!token) {
    console.warn("[genius] GENIUS_ACCESS_TOKEN not set — skipping Genius fallback");
    return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null };
  }

  try {
    const query = encodeURIComponent(`${songTitle} ${artistName}`);
    const res = await fetch(`${GENIUS_BASE}/search?q=${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[genius search] error", res.status, res.statusText);
      return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null };
    }

    const data = (await res.json()) as {
      response?: {
        hits?: Array<{
          result: {
            id: number;
            song_art_image_thumbnail_url?: string;
            primary_artist?: { id: number };
          };
        }>;
      };
    };

    const hits = data.response?.hits ?? [];
    if (hits.length === 0) {
      return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null };
    }

    const best = hits[0].result;
    return {
      thumbnailUrl: best.song_art_image_thumbnail_url ?? null,
      geniusSongId: String(best.id),
      geniusArtistId: best.primary_artist?.id ? String(best.primary_artist.id) : null,
    };
  } catch {
    return { thumbnailUrl: null, geniusSongId: null, geniusArtistId: null };
  }
}
