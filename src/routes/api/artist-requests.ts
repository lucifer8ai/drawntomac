import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  artists: z.array(z.string().min(1)).min(1).max(10),
});

export const Route = createFileRoute("/api/artist-requests")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!authHeader.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return Response.json({ error: "Expected { artists: string[] }" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: claimsData, error: claimsErr } = await supabaseAdmin.auth.getUser(token);
        if (claimsErr || !claimsData?.user) {
          return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }

        const rows = parsed.data.artists.map((name) => ({
          user_id: claimsData.user.id,
          artist_name: name.trim(),
        }));

        const { error } = await supabaseAdmin.from("artist_requests").insert(rows);
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ success: true, count: rows.length });
      },
    },
  },
});
