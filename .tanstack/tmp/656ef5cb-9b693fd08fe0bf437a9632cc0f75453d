import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

function slugifyBase(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slugifySong(title: string, id: string): string {
  return `${slugifyBase(title)}-${id.slice(-6)}`;
}

const trackSchema = z.object({
  type: z.literal("track"),
  itunesId: z.string(),
  title: z.string(),
  artistName: z.string(),
  artistItunesId: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  itunesUrl: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  slug: z.string().optional(),
});

const albumSchema = z.object({
  type: z.literal("album"),
  itunesId: z.string(),
  title: z.string(),
  artistName: z.string(),
  artistItunesId: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  itunesUrl: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  slug: z.string().optional(),
});

const bodySchema = z.discriminatedUnion("type", [trackSchema, albumSchema]);

export const Route = createFileRoute("/api/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
        }
        const body = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let artistId: string | null = null;
        if (body.artistItunesId) {
          const { data: artist, error: artistErr } = await supabaseAdmin
            .from("artists")
            .upsert(
              {
                name: body.artistName,
                slug: slugifyBase(body.artistName).slice(0, 80) || body.artistItunesId,
                itunes_id: body.artistItunesId,
              },
              { onConflict: "itunes_id" },
            )
            .select("id")
            .single();
          if (artistErr) {
            console.error("[itunes import] artist upsert", artistErr);
            return Response.json({ error: artistErr.message }, { status: 500 });
          }
          artistId = artist?.id ?? null;
        }

        const slug = body.slug ?? slugifySong(body.title, body.itunesId);

        const songRow = {
          title: body.title,
          slug,
          itunes_id: body.itunesId,
          artist_id: artistId,
          cover_url: body.coverUrl ?? null,
          preview_url: body.type === "track" ? (body.previewUrl ?? null) : null,
          itunes_url: body.itunesUrl ?? null,
          release_date: body.releaseDate ?? null,
        };

        const { error: songErr } = await supabaseAdmin
          .from("songs")
          .upsert(songRow, { onConflict: "itunes_id" });
        if (songErr) {
          console.error("[itunes import] song upsert", songErr);
          return Response.json({ error: songErr.message }, { status: 500 });
        }

        return Response.json({ slug });
      },
    },
  },
});