import { createFileRoute } from "@tanstack/react-router";
import { searchRecordings, type ParsedMusicBrainzResult } from "@/lib/musicbrainz";

export interface SearchHit {
  mbid: string;
  title: string;
  artistName: string;
  artistMbid: string | null;
  releaseGroupMbid: string | null;
  releaseDate: string | null;
}

function toHit(r: ParsedMusicBrainzResult): SearchHit {
  return {
    mbid: r.mbid,
    title: r.title,
    artistName: r.artistName,
    artistMbid: r.artistMbid,
    releaseGroupMbid: r.releaseGroupMbid,
    releaseDate: r.releaseDate,
  };
}

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json([]);

        try {
          const results = await searchRecordings(q, 8);
          return Response.json(results.map(toHit));
        } catch (err) {
          console.error("[search]", err);
          return Response.json([], { status: 200 });
        }
      },
    },
  },
});
