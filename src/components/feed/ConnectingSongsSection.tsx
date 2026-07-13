import { Link } from "@tanstack/react-router";
import type { ConnectingSong } from "@/hooks/useConnectingSongs";

interface ConnectingSongsSectionProps {
  songs: ConnectingSong[];
  loading: boolean;
}

export function ConnectingSongsSection({ songs, loading }: ConnectingSongsSectionProps) {
  if (loading) return null;
  if (songs.length === 0) {
    return (
      <div className="text-xs text-muted-foreground/60">
        Your matches haven't discovered anything new for you yet.
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold">Songs connecting you</h3>
      <p className="text-xs text-muted-foreground mb-3">
        What your top matches are into that you haven't heard yet.
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible">
        {songs.map((song) => (
          <Link
            key={song.id}
            to="/song/$slug"
            params={{ slug: song.slug }}
            className="flex-shrink-0 w-[140px] rounded-xl border bg-raised p-2 transition-colors hover:border-foreground/12"
          >
            {song.albumArtUrl ? (
              <img
                src={song.albumArtUrl}
                alt={`${song.title} album art`}
                className="h-16 w-full rounded-lg object-cover mb-1"
                loading="lazy"
              />
            ) : (
              <div className="h-16 w-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground mb-1">
                —
              </div>
            )}
            <div className="truncate text-xs font-semibold">{song.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">{song.artistName}</div>
            {song.sourceDisplayName && (
              <div className="truncate text-[10px] text-muted-foreground/60">
                via {song.sourceDisplayName}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
