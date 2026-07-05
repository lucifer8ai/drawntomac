import { createFileRoute } from "@tanstack/react-router";

function slugify(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${id.slice(-6)}`;
}

type SpotifyAlbum = {
  id: string;
  name: string;
  release_date?: string;
  external_urls?: { spotify?: string };
  images?: Array<{ url: string }>;
  artists?: Array<{ id: string; name: string }>;
};

export const Route = createFileRoute("/api/spotify/new-releases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);
          const { getSpotifyToken } = await import("@/lib/spotify-token.server");
          const token = await getSpotifyToken();
          const endpoint = `https://api.spotify.com/v1/browse/new-releases?market=IN&limit=50&offset=${offset}`;
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return Response.json({ albums: [], total: 0 });
          const json = (await res.json()) as {
            albums?: { items?: SpotifyAlbum[]; total?: number };
          };
          console.log("[spotify new-releases] raw response:", JSON.stringify(json));
          const items = json.albums?.items ?? [];
          const albums = items
            .map((a) => ({
              type: "album" as const,
              spotifyId: a.id,
              albumName: a.name,
              artistName: a.artists?.[0]?.name ?? "Unknown",
              artistSpotifyId: a.artists?.[0]?.id ?? null,
              coverUrl: a.images?.[0]?.url ?? null,
              releaseDate: a.release_date ?? null,
              spotifyUrl: a.external_urls?.spotify ?? null,
              slug: slugify(a.name, a.id),
            }))
            .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
          return Response.json({ albums, total: json.albums?.total ?? albums.length, rawSpotifyResponse: json });
        } catch (err) {
          console.error("[spotify new-releases]", err);
          const message = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
          return Response.json({ albums: [], total: 0, error: message });
        }
      },
    },
  },
});
