import { createFileRoute } from "@tanstack/react-router";

// iTunes has no "top artists" / browse endpoint like Spotify did, so we seed
// a varied list of well-known artists and pull one album cover each via
// search. Swap these names for whatever genres/artists fit #drawnto's vibe.
const SEED_ARTISTS = [
  "Frank Ocean", "Tame Impala", "SZA", "Radiohead", "Kendrick Lamar",
  "Fleetwood Mac", "Daft Punk", "Billie Eilish", "The Weeknd", "Arctic Monkeys",
  "Beyonce", "Mac Miller", "Tyler The Creator", "Amy Winehouse", "Bon Iver",
  "Kanye West", "Adele", "Travis Scott", "Lana Del Rey", "Outkast",
];

type ITunesAlbum = {
  collectionId: number;
  artworkUrl100?: string;
};

async function fetchArtwork(artist: string): Promise<string | null> {
  try {
    const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(
      artist,
    )}&media=music&entity=album&limit=1`;
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: ITunesAlbum[] };
    const art = json.results?.[0]?.artworkUrl100;
    return art ? art.replace("100x100", "600x600") : null;
  } catch {
    return null;
  }
}

let cache: { images: string[]; fetchedAt: number } | null = null;
const CACHE_MS = 1000 * 60 * 60; // 1 hour

export const Route = createFileRoute("/api/collage-images")({
  server: {
    handlers: {
      GET: async () => {
        if (cache && Date.now() - cache.fetchedAt < CACHE_MS && cache.images.length > 0) {
          return Response.json({ images: cache.images, replacements: [] });
        }
        const results = await Promise.all(SEED_ARTISTS.map(fetchArtwork));
        const images = results.filter((x): x is string => !!x);
        cache = { images, fetchedAt: Date.now() };
        return Response.json({ images, replacements: [] });
      },
    },
  },
});