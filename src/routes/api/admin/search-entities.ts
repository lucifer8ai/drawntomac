import { createFileRoute } from "@tanstack/react-router";

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.replace("Bearer ", "") || null;
}

export const Route = createFileRoute("/api/admin/search-entities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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

        const url = new URL(request.url);
        const q = url.searchParams.get("q")?.trim().toLowerCase();
        const type = url.searchParams.get("type") ?? "artist";

        if (!q) {
          return Response.json([]);
        }

        if (type === "artist") {
          const { data } = await supabaseAdmin
            .from("artists")
            .select("id, name, slug, image_url")
            .ilike("name", `%${q}%`)
            .order("name")
            .limit(50);

          return Response.json(data ?? []);
        }

        if (type === "album") {
          const { data } = await supabaseAdmin
            .from("release_groups")
            .select("id, title, slug, image_url")
            .ilike("title", `%${q}%`)
            .order("title")
            .limit(50);

          return Response.json(data ?? []);
        }

        if (type === "song") {
          const { data } = await supabaseAdmin
            .from("songs")
            .select("id, title, slug")
            .ilike("title", `%${q}%`)
            .order("title")
            .limit(50);

          return Response.json(data ?? []);
        }

        return Response.json({ error: "Invalid type" }, { status: 400 });
      },
    },
  },
});
