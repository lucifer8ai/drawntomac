import { createFileRoute, notFound, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/lib/types";
import { BackHeader } from "@/components/nav/BackHeader";

type ArtistRecord = Tables<"artists"> & { artist_countries: string[] | null };
type SongRecord = Tables<"songs">;

type LoaderData = {
  artist: ArtistRecord;
  songs: SongRecord[];
  engagement: {
    total_hears: number;
    total_likes: number;
    total_reviews: number;
    total_listeners: number;
  } | null;
};

export const Route = createFileRoute("/artist/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const artist = data?.artist;
    const title = artist
      ? `${artist.name} · #drawnto`
      : "#drawnto";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: artist ? `Browse songs by ${artist.name}.` : "#drawnto",
        },
        { property: "og:title", content: title },
        ...(artist?.image_url
          ? [{ property: "og:image", content: artist.image_url }]
          : []),
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: artist, error } = await supabase
      .from("artists")
      .select("*, artist_countries")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!artist) throw notFound();

    const { data: songs } = await supabase
      .from("songs")
      .select("*")
      .eq("artist_id", artist.id)
      .order("release_date", { ascending: false })
      .limit(100);

    const { data: engagement } = await (supabase.rpc as any)("get_artist_engagement", {
      p_artist_id: artist.id,
    });

    return {
      artist: artist as unknown as ArtistRecord,
      songs: (songs ?? []) as SongRecord[],
      engagement: engagement as LoaderData["engagement"],
    };
  },
  component: ArtistPage,
  errorComponent: ({ error }) => (
    <ArtistShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Couldn&apos;t load this artist. {error.message}
      </div>
    </ArtistShell>
  ),
  notFoundComponent: () => (
    <ArtistShell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Artist not found.
      </div>
    </ArtistShell>
  ),
});

function ArtistShell({ children }: { children: React.ReactNode }) {
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

const ALLOWED_COUNTRIES = ["IN", "US", "GB", "AU", "CA", "XW", "PK"];

function ArtistPage() {
  const { artist, songs, engagement } = Route.useLoaderData() as LoaderData;

  const countries = artist.artist_countries ?? [];
  const primaryCountry = countries.find((c) =>
    ALLOWED_COUNTRIES.includes(c.toUpperCase()),
  ) ?? (countries.length > 0 ? countries[0] : null);

  const genreTags = artist.artist_countries
    ? [] // No genre_tags on artists table; leave empty for now
    : [];

  return (
    <main className="mx-auto max-w-6xl">
      {/* Hero */}
      <div className="relative w-full" style={{ height: "min(320px, 40vw)" }}>
        {artist.image_url ? (
          <img
            src={artist.image_url}
            alt={artist.name}
            className="h-full w-full object-cover"
            loading="eager"
          />
        ) : (
          <div className="h-full w-full bg-secondary/20 flex items-center justify-center">
            <span className="text-6xl text-white/10 font-black">
              {artist.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground animate-fade-in-up">
            {artist.name}
          </h1>
          {primaryCountry && (
            <p className="mt-2 text-sm text-muted-foreground">
              {primaryCountry}
            </p>
          )}
          {engagement && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>{engagement.total_hears} listens</span>
              <span>{engagement.total_likes} likes</span>
              <span>{engagement.total_reviews} reviews</span>
            </div>
          )}
        </div>
      </div>

      {/* Songs */}
      <section aria-label={`Songs by ${artist.name}`} className="px-4 md:px-10 py-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60 mb-4">
          Songs ({songs.length})
        </h2>
        {songs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No songs yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {songs.map((song) => (
              <Link
                key={song.id}
                to="/song/$slug"
                params={{ slug: song.slug } as any}
                className="block rounded-2xl border bg-raised p-3 hover:bg-white/[0.03] transition-colors focus-visible:ring-1 focus-visible:ring-ring"
              >
                <p className="text-sm font-medium text-foreground truncate">
                  {song.title}
                </p>
                {song.release_date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(song.release_date).getFullYear()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
