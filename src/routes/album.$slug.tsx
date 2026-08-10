import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DetailShell } from "@/components/layout/DetailShell";
import { slugifyBase } from "@/lib/slugify";
import { resolveBackURL } from "@/lib/navigation";

type AlbumSong = {
  id: string;
  title: string;
  slug: string;
  track_number: number | null;
  genius_thumbnail_url: string | null;
};

type AlbumData = {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  primary_type: string | null;
  release_date: string | null;
  artist: { id: string; name: string; slug: string } | null;
};

type LoaderData = {
  album: AlbumData;
  songs: AlbumSong[];
  fallbackArtwork: string | null;
};

export const Route = createFileRoute("/album/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const title = data?.album ? `${data.album.title} · #drawnto` : "#drawnto";
    const description = data?.album?.artist
      ? `Album by ${data.album.artist.name}.`
      : "#drawnto";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: album, error } = await supabase
      .from("release_groups")
      .select("*, artist:artists!release_groups_artist_id_fkey(id, name, slug)")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!album) throw notFound();

    const { data: songs } = await supabase
      .from("songs")
      .select("id, title, slug, track_number, genius_thumbnail_url")
      .eq("release_group_id", (album as any).id)
      .order("track_number", { ascending: true, nullsFirst: false });

    const fallbackArtwork =
      (songs ?? []).find((s) => s.genius_thumbnail_url)?.genius_thumbnail_url ??
      null;

    return {
      album: album as unknown as AlbumData,
      songs: (songs ?? []) as AlbumSong[],
      fallbackArtwork,
    };
  },
  component: AlbumPage,
  errorComponent: ({ error }) => (
    <DetailShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-muted-foreground">
        Couldn&apos;t load this album. {error.message}
      </div>
    </DetailShell>
  ),
  notFoundComponent: () => (
    <DetailShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-muted-foreground">
        Album not found.
      </div>
    </DetailShell>
  ),
});

function AlbumPage() {
  const { album, songs, fallbackArtwork } = Route.useLoaderData() as LoaderData;
  const router = useRouter();
  const search = router.state.location.search as Record<string, unknown>;
  const from = search.from as string | undefined;
  const fromSlug = search.fromSlug as string | undefined;
  const year = album.release_date
    ? new Date(album.release_date).getFullYear()
    : null;

  const artworkUrl = album.image_url ?? fallbackArtwork;

  return (
    <DetailShell backTo={resolveBackURL(from, fromSlug)}>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="md:grid md:grid-cols-[320px_1fr] md:gap-8">
          <div className="mb-6 md:mb-0">
            <div className="mx-auto w-[200px] md:w-[320px] aspect-square rounded-2xl border border-border bg-raised overflow-hidden">
              {artworkUrl ? (
                <img
                  src={artworkUrl}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="md:scale-100 scale-75"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="10" r="3" />
                    <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-5xl font-bold text-foreground">
              {album.title}
            </h1>

            {album.artist && (
              <Link
                to="/artist/$slug"
                params={{ slug: album.artist.slug }}
                search={{ from: "album", fromSlug: album.slug }}
                className="mt-1 text-sm md:text-lg text-foreground/70 hover:text-foreground transition-colors"
              >
                by {album.artist.name}
              </Link>
            )}

            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {album.primary_type && <span>{album.primary_type}</span>}
              {album.primary_type && year && <span>·</span>}
              {year && <span>{year}</span>}
              <span>·</span>
              <span>
                {songs.length} {songs.length === 1 ? "song" : "songs"}
              </span>
            </div>

            {songs.length > 0 && (
              <div className="mt-6">
                {songs.map((song, i) => (
                  <div
                    key={song.id}
                    className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="w-6 text-right text-xs text-muted-foreground tabular-nums shrink-0">
                      {song.track_number ?? i + 1}
                    </span>
                    <Link
                      to="/song/$slug"
                      params={{ slug: song.slug }}
                      search={{ from: "album", fromSlug: album.slug }}
                      className="text-sm font-medium text-foreground hover:opacity-80 transition-opacity truncate"
                    >
                      {song.title}
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {songs.length === 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                No songs found for this album.
              </p>
            )}
          </div>
        </div>
      </main>
    </DetailShell>
  );
}
