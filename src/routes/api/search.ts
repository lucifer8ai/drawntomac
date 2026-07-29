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
  songCount?: number;
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
  song_count: number;
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
    subtitle: `${r.song_count} songs`,
    slug: r.slug,
    thumbnailUrl: r.image_url,
    songCount: r.song_count,
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

interface CachedResult {
  json: string;
  status: number;
  headers: Record<string, string>;
}

function jsonResult(body: unknown, status = 200): CachedResult {
  return {
    json: JSON.stringify(body),
    status,
    headers: { "content-type": "application/json" },
  };
}

function materializeResponse(cache: CachedResult): Response {
  return new Response(cache.json, {
    status: cache.status,
    headers: cache.headers,
  });
}

// In-flight request dedup: cache promises keyed by q+artist
const pendingRequests = new Map<string, Promise<CachedResult>>();

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
        const language =
          (url.searchParams.get("language") ?? "").trim() || undefined;
        const era =
          (url.searchParams.get("era") ?? "").trim() || undefined;

        const cacheKey = `${q}|${artist ?? ""}|${language ?? ""}|${era ?? ""}`;
        const pending = pendingRequests.get(cacheKey);
        if (pending) return materializeResponse(await pending);

        const promise = doSearch(q, artist, language, era);
        pendingRequests.set(cacheKey, promise);
        try {
          return materializeResponse(await promise);
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
  language?: string,
  era?: string,
): Promise<CachedResult> {
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    // 1. Run all three local searches in parallel
    const [songsRes, artistsRes, albumsRes] = await Promise.allSettled([
      searchLocalSongs(q, language, era),
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

    // 2. MusicBrainz + Genius artwork: parallel external calls (if local songs < 8)
    let mbSongs: SearchHit[] = [];
    if (localSongs.length < 8) {
      const [mbResult, geniusResult] = await Promise.allSettled([
        searchRecordings(
          q,
          Math.max(8 - localSongs.length, 3),
          "artists+tags+releases+genres",
          artist,
        ),
        searchGeniusForArtwork(q),
      ]);

      if (mbResult.status === "fulfilled" && !mbResult.value.error) {
        mbSongs = mbResult.value.results.map(toHit);
      } else if (mbResult.status === "rejected") {
        console.error("[search] MusicBrainz error:", mbResult.reason);
      }

      // Genius is artwork-only: attach thumbnails to MB results that lack images
      if (geniusResult.status === "fulfilled") {
        const geniusMap = geniusResult.value; // Map<title|artist, thumbnailUrl>
        for (const hit of mbSongs) {
          if (!hit.thumbnailUrl) {
            const key = `${hit.title}|${hit.subtitle}`.toLowerCase();
            const thumb = geniusMap.get(key);
            if (thumb) hit.thumbnailUrl = thumb;
          }
        }
      } else if (geniusResult.status === "rejected") {
        console.error("[search] Genius error:", geniusResult.reason);
      }

      // If MB fails and we have nothing local, return 429
      if (mbSongs.length === 0 && localSongs.length === 0 && localArtists.length === 0 && localAlbums.length === 0) {
        clearTimeout(timeout);
        return jsonResult({ error: "Search temporarily unavailable" }, 429);
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
    return jsonResult({
      songs: [...localSongs, ...dedupedMbSongs],
      artists: localArtists,
      albums: localAlbums,
    } satisfies CategorizedResults);
  } catch (err) {
    clearTimeout(timeout);
    console.error("[search]", err);
    return jsonResult(
      { error: err instanceof Error ? err.message : "Search failed" },
      429,
    );
  }
}

async function searchLocalSongs(q: string, language?: string, era?: string): Promise<SearchHit[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin.rpc as any)("search_local_songs", {
    p_query: q,
    p_limit: 8,
    p_language: language || null,
    p_era: era || null,
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

async function searchGeniusForArtwork(q: string): Promise<Map<string, string>> {
  const token = process.env.GENIUS_ACCESS_TOKEN;
  const map = new Map<string, string>();
  if (!token) return map;

  try {
    const res = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return map;
    const data = (await res.json()) as {
      response?: { hits?: Array<{ result: { id: number; title: string; primary_artist?: { id: number; name?: string }; song_art_image_thumbnail_url?: string; header_image_thumbnail_url?: string } }> };
    };

    for (const h of data.response?.hits ?? []) {
      const r = h.result;
      const thumb = r.song_art_image_thumbnail_url ?? r.header_image_thumbnail_url ?? null;
      if (!thumb || !r.title) continue;
      const artistName = r.primary_artist?.name ?? "Unknown";
      const key = `${r.title}|${artistName}`.toLowerCase();
      if (!map.has(key)) map.set(key, thumb);
    }
  } catch {}
  return map;
}
