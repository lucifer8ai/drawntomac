import { createFileRoute } from "@tanstack/react-router";

function slugify(title: string, id: string | number): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base}-${String(id).slice(-6)}`;
}

type ITunesTrack = {
  trackId: number;
  trackName: string;
  artistId?: number;
  artistName?: string;
  artworkUrl100?: string;
  previewUrl?: string | null;
  trackViewUrl?: string;
  releaseDate?: string;
};

// NOTE: iTunes Search API is public and unauthenticated — no token/client-id
// logic needed at all. Apple asks that you stay under ~20 requests/min per IP,
// so consider adding caching here if search volume grows.
export const Route = createFileRoute("/api/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim();
        if (!q) return Response.json([]);

        try {
          const endpoint = `https://itunes.apple.com/search?term=${encodeURIComponent(
            q,
          )}&media=music&entity=song&limit=8`;
          const res = await fetch(endpoint);
          if (!res.ok) {
            return Response.json([], { status: 200 });
          }
          const json = (await res.json()) as { results?: ITunesTrack[] };
          const items = json.results ?? [];
          const results = items.map((t) => ({
            itunesId: String(t.trackId),
            title: t.trackName,
            artistName: t.artistName ?? "Unknown",
            artistItunesId: t.artistId ? String(t.artistId) : null,
            coverUrl: t.artworkUrl100 ? t.artworkUrl100.replace("100x100", "600x600") : null,
            previewUrl: t.previewUrl ?? null,
            itunesUrl: t.trackViewUrl ?? null,
            releaseDate: t.releaseDate ?? null,
            slug: slugify(t.trackName, t.trackId),
          }));
          return Response.json(results);
        } catch (err) {
          console.error("[itunes search]", err);
          return Response.json([], { status: 200 });
        }
      },
    },
  },
});