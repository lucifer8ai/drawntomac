import { createFileRoute } from "@tanstack/react-router";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  return token || null;
}

export const Route = createFileRoute("/api/upload")({
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
        const realUserId = claimsData.user.id;

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return Response.json({ error: "Invalid form data" }, { status: 400 });
        }

        const userId = formData.get("userId")?.toString() ?? "";
        const bucket = formData.get("bucket")?.toString() ?? "";
        const file = formData.get("file") as File | null;

        if (!userId || !bucket || !file) {
          return Response.json({ error: "Missing required fields: userId, bucket, file" }, { status: 400 });
        }

        if (realUserId !== userId) {
          return Response.json({ error: "Forbidden: user ID mismatch" }, { status: 403 });
        }

        if (!["avatars", "banners"].includes(bucket)) {
          return Response.json({ error: "Invalid bucket" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
          return Response.json({ error: "File too large. Maximum size is 5MB." }, { status: 413 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          return Response.json({ error: "Invalid file type. Allowed: PNG, JPEG, WebP, GIF." }, { status: 400 });
        }

        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${bucket === "avatars" ? "avatar" : "banner"}.${ext}`;

        const buffer = await file.arrayBuffer();
        const { error: uploadErr } = await supabaseAdmin.storage
          .from(bucket)
          .upload(path, buffer, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadErr) {
          console.error("[upload] storage error:", uploadErr);
          return Response.json({ error: "Upload failed" }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
        return Response.json({ url: publicUrlData.publicUrl });
      },

      DELETE: async ({ request }) => {
        const token = extractToken(request);
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: claimsData, error: claimsErr } = await supabaseAdmin.auth.getUser(token);
        if (claimsErr || !claimsData?.user) {
          return Response.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        const realUserId = claimsData.user.id;

        const url = new URL(request.url);
        const userId = url.searchParams.get("userId") ?? "";
        const bucket = url.searchParams.get("bucket") ?? "";

        if (!userId || !bucket) {
          return Response.json({ error: "Missing required params: userId, bucket" }, { status: 400 });
        }

        if (realUserId !== userId) {
          return Response.json({ error: "Forbidden: user ID mismatch" }, { status: 403 });
        }

        if (!["avatars", "banners"].includes(bucket)) {
          return Response.json({ error: "Invalid bucket" }, { status: 400 });
        }

        const { data: existing } = await supabaseAdmin.storage.from(bucket).list(userId, {
          limit: 1,
          search: bucket === "avatars" ? "avatar" : "banner",
        });

        if (!existing || existing.length === 0) {
          return Response.json({ deleted: false });
        }

        const paths = existing.map((f) => `${userId}/${f.name}`);
        const { error: removeErr } = await supabaseAdmin.storage.from(bucket).remove(paths);

        if (removeErr) {
          console.error("[upload] delete error:", removeErr);
          return Response.json({ error: "Delete failed" }, { status: 500 });
        }

        return Response.json({ deleted: true });
      },
    },
  },
});
