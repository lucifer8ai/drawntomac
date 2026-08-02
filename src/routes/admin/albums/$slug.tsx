import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminAlbumForm } from "@/components/admin/AdminAlbumForm";

export const Route = createFileRoute("/admin/albums/$slug")({
  loader: async ({ params }) => {
    const { data: album } = await supabase
      .from("release_groups")
      .select("id, title, slug, image_url, primary_type, release_date")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!album) throw redirect({ to: "/admin/albums" });

    return album;
  },
  component: AdminAlbumEdit,
});

function AdminAlbumEdit() {
  const album = Route.useLoaderData();
  return <AdminAlbumForm album={album} />;
}
