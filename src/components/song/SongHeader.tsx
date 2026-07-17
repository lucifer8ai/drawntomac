import { Link } from "@tanstack/react-router";
import type { Tables } from "@/lib/types";

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };

type SongInfo = Pick<
  SongWithArtist,
  "title" | "release_date" | "genre_tags" | "preview_url"
> & { artist: Pick<Tables<"artists">, "name" | "slug"> | null };

export function SongHeader({ song }: { song: SongInfo }) {
  return (
    <div>
      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight italic break-words hyphens-auto text-white">
        {song.title}
      </h1>
      {song.artist?.slug ? (
        <Link
          to="/artist/$slug"
          params={{ slug: song.artist.slug } as any}
          className="mt-2 inline-block text-base md:text-lg font-medium text-artist hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          {song.artist.name}
        </Link>
      ) : (
        <p className="mt-2 text-base md:text-lg font-medium text-artist">
          {song.artist?.name ?? "Unknown artist"}
        </p>
      )}

      {song.release_date && (
        <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
          {new Date(song.release_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}

      {song.genre_tags && song.genre_tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {song.genre_tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
