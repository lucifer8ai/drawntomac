import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ArtistHero, ArtistHeader, DiscographyFeed } from "@/components/artist";
import { slugifyBase } from "@/lib/slugify";
import { resolveBackURL } from "@/lib/navigation";

type DiscographySong = {
  id: string;
  title: string;
  slug: string;
  primary_artist_name: string;
  primary_artist_slug: string;
  primary_artist_image_url: string | null;
  role: string;
  image_url: string | null;
  created_at: string;
};

type LoaderData = {
  artist: { id: string; name: string; slug: string; image_url: string | null };
  discography: DiscographySong[];
};

function Shell({ children, from, fromSlug }: { children: React.ReactNode; from?: string; fromSlug?: string }) {
  const backURL = resolveBackURL(from, fromSlug);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/home" className="text-2xl font-black tracking-tight text-foreground">
            #d.To
          </Link>
          <Link {...backURL} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export const Route = createFileRoute("/artist/$slug")({
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const title = data?.artist ? `${data.artist.name} · #drawnto` : "#drawnto";
    return {
      meta: [
        { title },
        { name: "description", content: data?.artist ? `Discography for ${data.artist.name}.` : "#drawnto" },
        { property: "og:title", content: title },
      ],
    };
  },
  loader: async ({ params }) => {
    const { data: artist, error } = await supabase
      .from("artists")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();

    if (error) throw error;
    if (!artist) throw notFound();

    const { data: discography } = await supabase.rpc("get_artist_discography", {
      p_artist_id: artist.id,
    });

    return {
      artist,
      discography: (discography ?? []) as DiscographySong[],
    };
  },
  component: ArtistPage,
  errorComponent: ({ error }) => (
    <Shell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">
        Couldn&apos;t load this artist. {error.message}
      </div>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <div className="mx-auto max-w-2xl p-8 text-center text-white/70">Artist not found.</div>
    </Shell>
  ),
});

function ArtistPage() {
  const { artist, discography } = Route.useLoaderData() as LoaderData;
  const router = useRouter();
  const search = router.state.location.search as Record<string, unknown>;
  const from = search.from as string | undefined;
  const fromSlug = search.fromSlug as string | undefined;
  const leadCount = discography.filter((s) => s.role === "lead").length;
  const featuredCount = discography.filter((s) => s.role === "featured").length;

  return (
    <Shell from={from} fromSlug={fromSlug}>
      <ArtistHero imageUrl={artist.image_url}>
        <ArtistHeader
          name={artist.name}
          leadCount={leadCount}
          featuredCount={featuredCount}
        />
      </ArtistHero>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {discography.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No songs found for this artist.</p>
        ) : (
          <DiscographyFeed songs={discography} from={from} fromSlug={fromSlug} />
        )}
      </main>
    </Shell>
  );
}
