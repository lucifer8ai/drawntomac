import { createFileRoute } from "@tanstack/react-router";
import {
  searchRecordings,
  type ParsedMusicBrainzResult,
} from "@/lib/musicbrainz";

export type SearchCategory = "song" | "artist" | "album";

export interface SearchHit {
  category: SearchCategory;
  mbid: string;
  title: string;
  subtitle: string;
  slug: string | null;
  thumbnailUrl: string | null;
  // Song-specific fields (used by /api/import)
  artistName?: string;
  primaryArtistName?: string;
  artistMbid?: string | null;
  releaseGroupMbid?: string | null;
  releaseDate?: string | null;
}

interface DBSongHit {
  song_id: string;
  title: string;
  slug: string;
  artist_name: string | null;
  thumbnail_url: string | null;
  musicbrainz_id: string | null;
}

interface DBArtistHit {
  artist_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  musicbrainz_id: string | null;
}

interface DBAlbumHit {
  release_group_mbid: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  song_count: number;
  slug?: string;
}

export interface CategorizedResults {
  songs: SearchHit[];
  artists: SearchHit[];
  albums: SearchHit[];
}

function toHit(r: ParsedMusicBrainzResult): SearchHit {
  return {
    category: "song",
    mbid: r.mbid,
    title: r.title,
    subtitle: r.artistName,
    slug: null,
    thumbnailUrl: null,
    artistName: r.artistName,
    primaryArtistName: r.primaryArtistName,
    artistMbid: r.artistMbid,
    releaseGroupMbid: r.releaseGroupMbid,
    releaseDate: r.releaseDate,
  };
}

function toSongHit(r: DBSongHit): SearchHit {
  return {
    category: "song",
    mbid: r.musicbrainz_id ?? r.song_id,
    title: r.title,
    subtitle: r.artist_name ?? "Unknown",
    slug: r.slug,
    thumbnailUrl: r.thumbnail_url,
  };
}

function toArtistHit(r: DBArtistHit): SearchHit {
  return {
    category: "artist",
    mbid: r.musicbrainz_id ?? r.artist_id,
    title: r.name,
    subtitle: "",
    slug: r.slug,
    thumbnailUrl: r.image_url,
  };
}

function toAlbumHit(r: DBAlbumHit): SearchHit {
  return {
    category: "album",
    mbid: r.release_group_mbid,
    title: r.title,
    subtitle: r.artist_name ?? "",
    slug: r.slug ?? null,
    thumbnailUrl: r.cover_url,
    releaseGroupMbid: r.release_group_mbid,
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
        if (!q) return Response.json({ songs: [], artists: [], albums: [] });
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
    // 1. Run all three local searches in parallel
    const [songsRes, artistsRes, albumsRes] = await Promise.allSettled([
      searchLocalSongs(q),
      searchLocalArtists(q),
      searchLocalAlbums(q),
    ]);

    const localSongs = songsRes.status === "fulfilled" ? songsRes.value : [];
    const localArtists = artistsRes.status === "fulfilled" ? artistsRes.value : [];
    const localAlbums = albumsRes.status === "fulfilled" ? albumsRes.value : [];

    // Log failures
    if (songsRes.status === "rejected") console.error("[search] local songs RPC failed", songsRes.reason);
    if (artistsRes.status === "rejected") console.error("[search] local artists RPC failed", artistsRes.reason);
    if (albumsRes.status === "rejected") console.error("[search] local albums RPC failed", albumsRes.reason);

    // 2. MusicBrainz song search (if local songs < 8)
    let mbSongs: SearchHit[] = [];
    if (localSongs.length < 8) {
      const { results, error } = await searchRecordings(
        q,
        Math.max(8 - localSongs.length, 3),
        "artists+tags+releases+genres",
        artist,
      );

      if (error) {
        console.error("[search] MusicBrainz error:", error);
        if (localSongs.length === 0 && localArtists.length === 0 && localAlbums.length === 0) {
          clearTimeout(timeout);
          return Response.json(
            { error: "Search temporarily unavailable" },
            { status: 429 },
          );
        }
      } else {
        mbSongs = results.map(toHit);
      }
    }

    // 3. Dedup MB songs against local by mbid
    const localMbids = new Set(localSongs.map((h) => h.mbid));
    const dedupedMbSongs = mbSongs.filter((h) => !localMbids.has(h.mbid));

    console.log("[search]", {
      query: q,
      localSongs: localSongs.length,
      mbSongs: mbSongs.length,
      localArtists: localArtists.length,
      localAlbums: localAlbums.length,
      durationMs: Date.now() - start,
    });

    clearTimeout(timeout);
    return Response.json({
      songs: [...localSongs, ...dedupedMbSongs],
      artists: localArtists,
      albums: localAlbums,
    } satisfies CategorizedResults);
  } catch (err) {
    clearTimeout(timeout);
    console.error("[search]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 429 },
    );
  }
}

async function searchLocalSongs(q: string): Promise<SearchHit[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("search_local_songs", {
    p_query: q,
    p_limit: 5,
  });
  if (error || !data) return [];
  return (data as DBSongHit[]).map(toSongHit);
}

async function searchLocalArtists(q: string): Promise<SearchHit[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("search_local_artists", {
    p_query: q,
    p_limit: 3,
  });
  if (error || !data) return [];
  return (data as DBArtistHit[]).map(toArtistHit);
}

async function searchLocalAlbums(q: string): Promise<SearchHit[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("search_local_albums", {
    p_query: q,
    p_limit: 3,
  });
  if (error || !data) return [];
  return (data as DBAlbumHit[]).map(toAlbumHit);
}
