import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { slugifyBase } from "@/lib/slugify";

const bodySchema = z.object({
  songId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  imageUrl: z.string().url().optional(),
  releaseDate: z.string().optional(),
  trackNumber: z.number().int().min(1).optional(),
  genreTags: z.array(z.string()).optional(),
  era: z.string().optional(),
  language: z.array(z.string()).optional(),
});

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

async function logAudit(
  admin: any,
  adminId: string,
  entityType: string,
  entityId: string,
  changes: { field: string; oldValue: string | null; newValue: string | null }[],
) {
  for (const c of changes) {
    if (c.oldValue !== c.newValue) {
      await admin.from("admin_audit_log").insert({
        admin_id: adminId,
        entity_type: entityType,
        entity_id: entityId,
        field_changed: c.field,
        old_value: c.oldValue,
        new_value: c.newValue,
      });
    }
  }
}

export const Route = createFileRoute("/api/admin/update-song")({
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

        const { songId, title, imageUrl, releaseDate, trackNumber, genreTags, era, language } = parsed.data;

        if (!title && !imageUrl && !releaseDate && trackNumber === undefined && !genreTags && !era && !language) {
          return Response.json({ error: "At least one field to update is required" }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin
          .from("songs")
          .select("title, genius_thumbnail_url, slug, release_date, track_number, genre_tags, era, language")
          .eq("id", songId)
          .maybeSingle();

        if (!existing) {
          return Response.json({ error: "Song not found" }, { status: 404 });
        }

        const updates: Record<string, any> = {};
        const auditChanges: { field: string; oldValue: string | null; newValue: string | null }[] = [];

        if (title && title !== existing.title) {
          updates.title = title;
          updates.slug = slugifyBase(title).slice(0, 80) || title;
          auditChanges.push({ field: "title", oldValue: existing.title, newValue: title });
        }
        if (imageUrl !== undefined) {
          updates.genius_thumbnail_url = imageUrl ?? null;
          auditChanges.push({ field: "genius_thumbnail_url", oldValue: existing.genius_thumbnail_url, newValue: imageUrl });
        }
        if (releaseDate !== undefined) {
          updates.release_date = releaseDate || null;
          auditChanges.push({ field: "release_date", oldValue: existing.release_date, newValue: releaseDate });
        }
        if (trackNumber !== undefined) {
          updates.track_number = trackNumber;
          auditChanges.push({ field: "track_number", oldValue: existing.track_number?.toString() ?? null, newValue: trackNumber?.toString() ?? null });
        }
        if (genreTags !== undefined) {
          updates.genre_tags = genreTags;
          auditChanges.push({ field: "genre_tags", oldValue: JSON.stringify(existing.genre_tags), newValue: JSON.stringify(genreTags) });
        }
        if (era !== undefined) {
          updates.era = era || null;
          auditChanges.push({ field: "era", oldValue: existing.era, newValue: era });
        }
        if (language !== undefined) {
          updates.language = language;
          auditChanges.push({ field: "language", oldValue: JSON.stringify(existing.language), newValue: JSON.stringify(language) });
        }

        const { data: updated, error } = await supabaseAdmin
          .from("songs")
          .update(updates)
          .eq("id", songId)
          .select("id, title, slug, genius_thumbnail_url, release_date, track_number, genre_tags, era, language")
          .single();

        if (error) {
          console.error("[admin-update-song] error:", error);
          return Response.json({ error: "Update failed" }, { status: 500 });
        }

        await logAudit(supabaseAdmin, userId, "song", songId, auditChanges);

        return Response.json(updated);
      },
    },
  },
});
