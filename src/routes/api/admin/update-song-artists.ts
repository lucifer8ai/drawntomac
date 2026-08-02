import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  songId: z.string().uuid(),
  artists: z.array(z.object({
    artistId: z.string().uuid(),
    position: z.number().int().min(0),
    joinPhrase: z.string().optional().default(""),
  })),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

export const Route = createFileRoute("/api/admin/update-song-artists")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = extractToken(request);
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: claimsData, error: claimsErr } = await supabaseAdmin.auth.getUser(token);
        if (claimsErr || !claimsData?.user) {
          return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        const userId = claimsData.user.id;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("is_admin")
          .eq("id", userId)
          .maybeSingle();

        if (!profile?.is_admin) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

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

        const { songId, artists } = parsed.data;

        const { error: deleteErr } = await supabaseAdmin
          .from("song_artists")
          .delete()
          .eq("song_id", songId);

        if (deleteErr) {
          console.error("[admin-update-song-artists] delete error:", deleteErr);
          return Response.json({ error: "Failed to update artists" }, { status: 500 });
        }

        if (artists.length > 0) {
          const rows = artists.map((a) => ({
            song_id: songId,
            artist_id: a.artistId,
            position: a.position,
            join_phrase: a.joinPhrase || "",
          }));

          const { error: insertErr } = await supabaseAdmin
            .from("song_artists")
            .insert(rows);

          if (insertErr) {
            console.error("[admin-update-song-artists] insert error:", insertErr);
            return Response.json({ error: "Failed to insert artists" }, { status: 500 });
          }
        }

        await supabaseAdmin.from("admin_audit_log").insert({
          admin_id: userId,
          entity_type: "song",
          entity_id: songId,
          field_changed: "artists",
          new_value: JSON.stringify(artists.map((a) => a.artistId)),
        });

        return Response.json({ success: true });
      },
    },
  },
});
