import { createFileRoute } from "@tanstack/react-router";
import {
  searchRecordings,
  type ParsedMusicBrainzResult,
} from "@/lib/musicbrainz";

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

interface DBHit {
  song_id: string;
  title: string;
  slug: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  musicbrainz_id: string | null;
}

function toHitFromDB(r: DBHit): SearchHit {
  return {
    mbid: r.musicbrainz_id ?? r.song_id,
    title: r.title,
    artistName: r.artist_name ?? "Unknown",
    primaryArtistName: r.artist_name ?? "Unknown",
    artistMbid: null,
    releaseGroupMbid: null,
    releaseDate: null,
    thumbnailUrl: r.thumbnail_url,
  };
}

// In-flight request dedup: cache promises keyed by q+artist
const pendingRequests = new Map<string, Promise<Response>>();

export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").normalize("NFC").trim();
        if (!q) return Response.json([]);
        if (q.length > 200) {
          return Response.json({ error: "Query too long" }, { status: 400 });
        }

        const artist =
          (url.searchParams.get("artist") ?? "").trim() || undefined;

        const cacheKey = `${q}|${artist ?? ""}`;
        const pending = pendingRequests.get(cacheKey);
        if (pending) return pending;

        const promise = doSearch(q, artist);
        pendingRequests.set(cacheKey, promise);
        try {
          return await promise;
        } finally {
          pendingRequests.delete(cacheKey);
        }
      },
    },
  },
});

async function doSearch(
  q: string,
  artist?: string,
): Promise<Response> {
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // 1. Local DB search
    let localHits: SearchHit[] = [];
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // RPC function is new (migration not yet in generated types); cast to any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabaseAdmin.rpc as any)("search_local_songs", {
        p_query: q,
        p_limit: 5,
      });
      if (!error && data) {
        localHits = (data as DBHit[]).map(toHitFromDB);
      }
    } catch (err) {
      console.error("[search] local RPC failed, falling back to MB only", err);
    }

    // 2. MusicBrainz search (if local results < 8)
    let mbHits: SearchHit[] = [];
    if (localHits.length < 8) {
      const { results, error } = await searchRecordings(
        q,
        Math.max(8 - localHits.length, 3),
        "artists+tags+releases+genres",
        artist,
      );

      if (error) {
        console.error("[search] MusicBrainz error:", error);
        if (localHits.length === 0) {
          clearTimeout(timeout);
          return Response.json(
            { error: "Search temporarily unavailable" },
            { status: 429 },
          );
        }
      } else {
        mbHits = results.map(toHit);
      }
    }

    // 3. Dedup MB results against local by musicbrainz_id
    const localMbids = new Set(
      localHits.map((h) => h.mbid).filter(Boolean),
    );
    const dedupedMbHits = mbHits.filter(
      (h) => !localMbids.has(h.mbid),
    );

    const hits = [...localHits, ...dedupedMbHits];

    console.log("[search]", {
      query: q,
      localCount: localHits.length,
      mbCount: mbHits.length,
      dedupedMbCount: dedupedMbHits.length,
      totalHits: hits.length,
      durationMs: Date.now() - start,
    });

    clearTimeout(timeout);
    return Response.json(hits);
  } catch (err) {
    clearTimeout(timeout);
    console.error("[search]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 429 },
    );
  }
}
