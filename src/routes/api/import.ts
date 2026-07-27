import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isArtistInAllowedArea } from "@/lib/musicbrainz";
import { importSong } from "@/lib/song-import";

const bodySchema = z.object({
  mbid: z.string().min(1),
  title: z.string().min(1),
  artistName: z.string().min(1),
  primaryArtistName: z.string().optional(),
  artistMbid: z.string().nullable().optional(),
  releaseGroupMbid: z.string().nullable().optional(),
  releaseGroupTitle: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
});

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
          return Response.json(
            { error: "Invalid body", issues: parsed.error.issues },
            { status: 400 },
          );
        }
        const body = parsed.data;

        const { supabaseAdmin } =
          await import("@/integrations/supabase/client.server");

        const result = await importSong(supabaseAdmin, body, {
          isArtistInAllowedArea,
        });

        if (result.status === "skipped") {
          return Response.json(
            { error: "This artist is not from an allowed area." },
            { status: 403 },
          );
        }

        return Response.json({ slug: result.slug });
      },
    },
  },
});
