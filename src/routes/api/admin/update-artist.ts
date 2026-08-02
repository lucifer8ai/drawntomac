import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { slugifyBase } from "@/lib/slugify";

const bodySchema = z.object({
  artistId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  imageUrl: z.string().url().optional(),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

export const Route = createFileRoute("/api/admin/update-artist")({
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

        const { artistId, name, imageUrl } = parsed.data;

        if (!name && !imageUrl) {
          return Response.json({ error: "At least one field to update is required" }, { status: 400 });
        }

        const updates: Record<string, string> = {};
        if (name) {
          updates.name = name;
          updates.slug = slugifyBase(name).slice(0, 80) || name;
        }
        if (imageUrl) {
          updates.image_url = imageUrl;
        }

        const { data: updated, error } = await supabaseAdmin
          .from("artists")
          .update(updates)
          .eq("id", artistId)
          .select("id, name, slug, image_url")
          .single();

        if (error) {
          console.error("[admin-update-artist] error:", error);
          return Response.json({ error: "Update failed" }, { status: 500 });
        }

        return Response.json(updated);
      },
    },
  },
});
