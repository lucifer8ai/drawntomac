import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import type { MoverSong } from "@/hooks/useTopMovers";

interface TopMoversStripProps {
  songs: MoverSong[];
  loading: boolean;
  error: string | null;
}

export function TopMoversStrip({ songs, loading, error }: TopMoversStripProps) {
  if (loading || error || songs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Flame size={14} className="text-orange-400" />
        <span className="text-xs font-semibold uppercase tracking-wide">Rising fast</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
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
            <span className="text-xs font-medium text-green-400">
              {song.rankDelta !== null && song.rankDelta > 0 ? `↑${song.rankDelta}` : 'New'}
            </span>
            <div className="truncate text-xs font-semibold">{song.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">{song.artistName}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
