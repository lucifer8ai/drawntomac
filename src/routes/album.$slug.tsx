import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";
import { BackHeader } from "@/components/nav/BackHeader";

interface ReleaseGroup {
  id: string;
  title: string;
  slug: string;
  musicbrainz_id: string;
  artist_id: string | null;
  primary_type: string | null;
  image_url: string | null;
  release_date: string | null;
  created_at: string;
  artist: Tables<"artists"> | null;
}

type SongRecord = Tables<"songs">;

type LoaderData = {
  album: ReleaseGroup;
  songs: SongRecord[];
  engagement: {
    total_hears: number;
    total_likes: number;
    total_reviews: number;
    total_listeners: number;
  } | null;
};

export const Route = createFileRoute("/album/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const album = data?.album;
    const title = album
      ? `${album.title} — ${album.artist?.name ?? "Unknown"} · #drawnto`
      : "#drawnto";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: album ? `Tracklist and listens for ${album.title}.` : "#drawnto",
        },
        { property: "og:title", content: title },
        ...(album?.image_url
          ? [{ property: "og:image", content: album.image_url }]
          : []),
      ],
    };
  },
  loader: async ({ params }) => {
    // release_groups table is new — not yet in generated Supabase types
    const { data: album, error } = await (supabase.from as any)("release_groups")
      .select("*, artist:artists(*)")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!album) throw notFound();

    // release_group_id is a new column — not yet in generated Supabase types
    const { data: songs } = await (supabase.from as any)("songs")
      .select("*")
      .eq("release_group_id", album.id)
      .order("track_number", { ascending: true })
      .limit(200);

    const { data: engagement } = await (supabase.rpc as any)("get_album_engagement", {
      p_release_group_id: album.id,
    });

    return {
      album: album as unknown as ReleaseGroup,
      songs: (songs ?? []) as SongRecord[],
      engagement: engagement as LoaderData["engagement"],
    };
  },
  component: AlbumPage,
  errorComponent: ({ error }) => (
    <AlbumShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Couldn&apos;t load this album. {error.message}
      </div>
    </AlbumShell>
  ),
  notFoundComponent: () => (
    <AlbumShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Album not found.
      </div>
    </AlbumShell>
  ),
});

function AlbumShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackHeader
        label="Back"
        onBack={() => navigate({ to: "/home" })}
        solid
        logo="#drawnTo"
      />
      {children}
    </div>
  );
}

function AlbumPage() {
  const { album, songs, engagement } = Route.useLoaderData() as LoaderData;

  const typeLabel = album.primary_type
    ? album.primary_type.charAt(0).toUpperCase() + album.primary_type.slice(1)
    : "Album";

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-10 py-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        {/* Cover */}
        <div className="shrink-0 w-full md:w-[320px]">
          <div className="aspect-square rounded-2xl border bg-raised overflow-hidden">
            {album.image_url ? (
              <img
                src={album.image_url}
                alt={`${album.title} cover`}
                className="h-full w-full object-cover"
                loading="eager"
              />
            ) : (
              <div className="h-full w-full bg-secondary/20 flex items-center justify-center">
                <span className="text-4xl text-white/10">♫</span>
              </div>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {album.title}
          </h1>
          {album.artist?.slug ? (
            <Link
              to="/artist/$slug"
              params={{ slug: album.artist.slug } as any}
              className="mt-1 inline-block text-lg font-medium text-artist hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              {album.artist.name}
            </Link>
          ) : (
            <p className="mt-1 text-lg font-medium text-artist">
              {album.artist?.name ?? "Unknown"}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs">
              {typeLabel}
            </span>
            {album.release_date && (
              <span>{new Date(album.release_date).getFullYear()}</span>
            )}
            <span>· {songs.length} tracks</span>
          </div>
          {engagement && (
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{engagement.total_hears} listens</span>
              <span>{engagement.total_likes} likes</span>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist */}
      <section aria-label={`Tracklist for ${album.title}`} className="mt-10">
        <div className="border-b pb-2 mb-1 grid grid-cols-[32px_1fr_auto] gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="text-right">#</span>
          <span>Track</span>
          <span className="text-right">Listens</span>
        </div>
        {songs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">No songs.</p>
        ) : (
          <>
            {songs.map((song, i) => (
              <Link
                key={song.id}
                to="/song/$slug"
                params={{ slug: song.slug } as any}
                className={`grid grid-cols-[32px_1fr_auto] gap-3 items-center px-2 py-2 rounded-xl text-left hover:bg-white/[0.03] transition-colors focus-visible:ring-1 focus-visible:ring-ring ${
                  i % 2 === 1 ? "bg-white/[0.015]" : ""
                }`}
              >
                <span className="text-xs text-muted-foreground tabular-nums text-right pr-3">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {song.title}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  —
                </span>
              </Link>
            ))}
            <p className="mt-2 text-[11px] text-muted-foreground/50 italic">
              Track order is approximate until enriched with metadata from MusicBrainz.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
