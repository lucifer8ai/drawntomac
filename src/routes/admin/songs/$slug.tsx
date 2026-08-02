import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminSongForm } from "@/components/admin/AdminSongForm";

export const Route = createFileRoute("/admin/songs/$slug")({
  loader: async ({ params }) => {
    const { data: song } = await supabase
      .from("songs")
      .select("id, title, slug, genius_thumbnail_url, release_date, track_number, genre_tags, era, language")
      .eq("slug", params.slug)
      .maybeSingle();

    if (!song) throw redirect({ to: "/admin/songs" });

    const { data: songArtists } = await supabase
      .from("song_artists")
      .select("artist_id, position, join_phrase, artist:artists!song_artists_artist_id_fkey(name)")
      .eq("song_id", song.id)
      .order("position");

    return {
      song,
      songArtists: (songArtists ?? []).map((sa: any) => ({
        artistId: sa.artist_id,
        artistName: sa.artist?.name ?? "Unknown",
        position: sa.position,
        joinPhrase: sa.join_phrase,
      })),
    };
  },
  component: AdminSongEdit,
});

function AdminSongEdit() {
  const { song, songArtists } = Route.useLoaderData();
  return <AdminSongForm song={song} songArtists={songArtists} />;
}
