import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const ARTWORK_BUCKET = "artwork";

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

export const Route = createFileRoute("/api/admin/upload-artwork")({
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

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return Response.json({ error: "Invalid form data" }, { status: 400 });
        }

        const path = formData.get("path")?.toString() ?? "";
        const file = formData.get("file") as File | null;

        if (!path || !file) {
          return Response.json({ error: "Missing required fields: path, file" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return Response.json({ error: "File too large. Maximum size is 5MB." }, { status: 413 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          return Response.json({ error: "Invalid file type. Allowed: PNG, JPEG, WebP, GIF." }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(ARTWORK_BUCKET)
          .upload(path, buffer, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadErr) {
          console.error("[admin-upload] storage error:", uploadErr);
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage.from(ARTWORK_BUCKET).getPublicUrl(path);
        return Response.json({ url: publicUrlData.publicUrl });
      },
    },
  },
});
