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

type SpotifyTrack = {
  id: string;
  name: string;
  preview_url: string | null;
  external_urls?: { spotify?: string };
  album?: {
    images?: Array<{ url: string }>;
    release_date?: string;
  };
  artists?: Array<{ id: string; name: string }>;
};

export const Route = createFileRoute("/api/spotify/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json([]);

        try {
          const { getSpotifyToken } = await import("@/lib/spotify-token.server");
          const token = await getSpotifyToken();
          const endpoint = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&market=IN&limit=8`;
          const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            return Response.json([], { status: 200 });
          }
          const json = (await res.json()) as { tracks?: { items?: SpotifyTrack[] } };
          const items = json.tracks?.items ?? [];
          const results = items.map((t) => ({
            spotifyId: t.id,
            title: t.name,
            artistName: t.artists?.[0]?.name ?? "Unknown",
            artistSpotifyId: t.artists?.[0]?.id ?? null,
            coverUrl: t.album?.images?.[0]?.url ?? null,
            previewUrl: t.preview_url,
            spotifyUrl: t.external_urls?.spotify ?? null,
            releaseDate: t.album?.release_date ?? null,
            slug: slugify(t.name, t.id),
          }));
          return Response.json(results);
        } catch (err) {
          console.error("[spotify search]", err);
          return Response.json([], { status: 200 });
        }
      },
    },
  },
});
