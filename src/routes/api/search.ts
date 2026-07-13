import { createFileRoute } from "@tanstack/react-router";
import { searchRecordings, type ParsedMusicBrainzResult } from "@/lib/musicbrainz";
import { searchGeniusArtwork } from "@/lib/genius";

export interface SearchHit {
  mbid: string;
  title: string;
  artistName: string;
  primaryArtistName: string;
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseDate: string | null;
  thumbnailUrl: string | null;
}

function toHit(r: ParsedMusicBrainzResult): SearchHit {
  return {
    mbid: r.mbid,
    title: r.title,
    artistName: r.artistName,
    primaryArtistName: r.primaryArtistName,
    artistMbid: r.artistMbid,
    releaseGroupMbid: r.releaseGroupMbid,
    releaseDate: r.releaseDate,
    thumbnailUrl: null,
  };
}

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json([]);

        const artist = (url.searchParams.get("artist") ?? "").trim() || undefined;

        try {
          const results = await searchRecordings(q, 8, "artists+tags+releases+genres", artist);
          const hits = results.map(toHit);

          // Enrich with Genius artwork in parallel (fire-and-forget)
          const geniusToken = process.env.GENIUS_ACCESS_TOKEN;
          if (geniusToken && hits.length > 0) {
            await Promise.allSettled(
              hits.map(async (hit) => {
                try {
                  const genius = await searchGeniusArtwork(
                    hit.primaryArtistName || hit.artistName,
                    hit.title,
                  );
                  if (genius.thumbnailUrl) {
                    hit.thumbnailUrl = genius.thumbnailUrl;
                  }
                } catch {
                  // best-effort enrichment
                }
              }),
            );
          }

          return Response.json(hits);
        } catch (err) {
          console.error("[search]", err);
          return Response.json(
            { error: err instanceof Error ? err.message : "Search failed" },
            { status: 429 },
          );
        }
      },
    },
  },
});
