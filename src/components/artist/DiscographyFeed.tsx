import { SongCard } from "./SongCard";

interface DiscographySong {
  id: string;
  title: string;
  slug: string;
  primary_artist_name: string;
  primary_artist_slug: string;
  primary_artist_image_url: string | null;
  role: string;
  image_url: string | null;
  created_at: string;
}

export function DiscographyFeed({ songs }: { songs: DiscographySong[] }) {
  const leadSongs = songs.filter((s) => s.role === "lead");
  const featuredSongs = songs.filter((s) => s.role === "featured");

  return (
    <div className="space-y-8">
      {leadSongs.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg font-bold text-white">As Lead Artist</h2>
            <span className="text-xs text-muted-foreground">({leadSongs.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {leadSongs.map((s) => (
              <SongCard
                key={s.id}
                title={s.title}
                slug={s.slug}
                imageUrl={s.image_url}
                subtitle={s.created_at ? new Date(s.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short" }) : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {featuredSongs.length > 0 && (
        <section>
          <div className="flex items-baseline gap-2 mb-4">
            <h2 className="text-lg font-bold text-white">Featured / Collaborations</h2>
            <span className="text-xs text-muted-foreground">({featuredSongs.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredSongs.map((s) => (
              <SongCard
                key={s.id}
                title={s.title}
                slug={s.slug}
                imageUrl={s.image_url}
                subtitle={`w/ ${s.primary_artist_name}`}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
