import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { slugifyBase } from "@/lib/slugify";

const bodySchema = z.object({
  releaseGroupId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  imageUrl: z.string().url().optional(),
  primaryType: z.enum(["Album", "EP", "Single", "Other"]).optional(),
  releaseDate: z.string().optional(),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

export const Route = createFileRoute("/api/admin/update-release-group")({
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

        const { releaseGroupId, title, imageUrl, primaryType, releaseDate } = parsed.data;

        if (!title && !imageUrl && !primaryType && !releaseDate) {
          return Response.json({ error: "At least one field to update is required" }, { status: 400 });
        }

        const updates: Record<string, string | null> = {};
        if (title) {
          updates.title = title;
          updates.slug = slugifyBase(title).slice(0, 80) || title;
        }
        if (imageUrl !== undefined) updates.image_url = imageUrl;
        if (primaryType) updates.primary_type = primaryType;
        if (releaseDate !== undefined) updates.release_date = releaseDate || null;

        const { data: updated, error } = await supabaseAdmin
          .from("release_groups")
          .update(updates)
          .eq("id", releaseGroupId)
          .select("id, title, slug, image_url, primary_type, release_date")
          .single();

        if (error) {
          console.error("[admin-update-release-group] error:", error);
          return Response.json({ error: "Update failed" }, { status: 500 });
        }

        return Response.json(updated);
      },
    },
  },
});
