import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminArtistForm } from "@/components/admin/AdminArtistForm";

export const Route = createFileRoute("/admin/artists/$slug")({
  loader: async ({ params }) => {
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, slug, image_url")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!artist) throw redirect({ to: "/admin/artists" });

    return artist;
  },
  component: AdminArtistEdit,
});

function AdminArtistEdit() {
  const artist = Route.useLoaderData();
  return <AdminArtistForm artist={artist} />;
}
