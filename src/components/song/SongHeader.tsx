import type { Tables } from "@/lib/types";

type SongWithArtist = Tables<"songs"> & { artist: Tables<"artists"> | null };

type SongInfo =
  | Pick<SongWithArtist, "title" | "release_date" | "country" | "genre_tags" | "preview_url">
  & { artist: Pick<Tables<"artists">, "name" | "slug"> | null };

type AvgRating = { avg_rating: number | null; rating_count: number };

export function SongHeader({ song, rating }: { song: SongInfo; rating: AvgRating }) {
  return (
    <div>
      <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
        {song.title}
      </h1>
      <p className="mt-1 text-lg" style={{ color: "#E07B6A" }}>
        {song.artist?.name ?? "Unknown artist"}
      </p>

      {rating.rating_count > 0 && (
        <p className="mt-1 text-sm" style={{ color: "#8A8276" }}>
          {rating.avg_rating?.toFixed(1)} ★ · {rating.rating_count}{" "}
          {rating.rating_count === 1 ? "rating" : "ratings"}
        </p>
      )}

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
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
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
