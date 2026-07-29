import type { Tables } from "@/lib/types";
import { ArtistLink } from "@/components/artist";

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };

interface SongArtist {
  artist_id: string;
  position: number;
  join_phrase: string;
  artist: Tables<"artists"> | null;
}

type SongInfo = Pick<
  SongWithArtist,
  "title" | "release_date" | "genre_tags" | "preview_url"
> & { artist: Pick<Tables<"artists">, "name" | "slug"> | null };

export function SongHeader({ song, songArtists }: { song: SongInfo; songArtists?: SongArtist[] | null }) {
  const hasMultiArtist = songArtists && songArtists.length > 0;
  return (
    <div>
      <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold leading-tight italic break-words hyphens-auto text-white">
        {song.title}
      </h1>
      {hasMultiArtist ? (
        <p className="mt-2 text-base md:text-lg font-medium text-artist">
          {songArtists!.map((sa, i) => (
            <span key={sa.artist?.id ?? i}>
              {i > 0 && <span>{sa.join_phrase}</span>}
              <ArtistLink name={sa.artist?.name ?? null} slug={sa.artist?.slug ?? null} />
            </span>
          ))}
        </p>
      ) : (
        <p className="mt-2 text-base md:text-lg font-medium text-artist">
          <ArtistLink name={song.artist?.name ?? null} slug={song.artist?.slug ?? null} />
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
