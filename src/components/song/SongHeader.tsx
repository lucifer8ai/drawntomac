import type { Tables } from "@/lib/types";

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };

type SongInfo =
  | Pick<SongWithArtist, "title" | "release_date" | "country" | "genre_tags" | "preview_url">
  & { artist: Pick<Tables<"artists">, "name" | "slug"> | null };

export function SongHeader({ song }: { song: SongInfo }) {
  return (
    <div>
      <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white">
        {song.title}
      </h1>
      <p className="mt-1 text-lg" style={{ color: "#D4556A" }}>
        {song.artist?.name ?? "Unknown artist"}
      </p>

      {song.release_date && (
        <p className="mt-1 text-xs uppercase tracking-wider" style={{ color: "#8A8276" }}>
          {new Date(song.release_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {song.country ? ` · ${song.country}` : ""}
        </p>
      )}

      {song.genre_tags && song.genre_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {song.genre_tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "rgba(245,240,232,0.08)", color: "#8A8276" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
