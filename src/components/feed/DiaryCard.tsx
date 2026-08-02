import { Link } from "@tanstack/react-router";
import { Headphones, Heart, ThumbsDown, Pencil, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ArtistLink } from "@/components/artist";
import { slugifyBase } from "@/lib/slugify";

export interface DiaryCardData {
  songId: string;
  songTitle: string;
  songSlug: string;
  artistName: string | null;
  albumArtUrl: string | null;
  heard: boolean;
  liked: boolean;
  disliked: boolean;
  reviewed: boolean;
  want: boolean;
}

export function DiaryCard({ data }: { data: DiaryCardData }) {
  return (
    <Link
      to="/song/$slug"
      params={{ slug: data.songSlug }}
      className="block transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="flex items-center gap-2 md:gap-3 border-b px-4 py-2.5 md:py-3">
        {data.albumArtUrl ? (
          <img
            src={data.albumArtUrl}
            alt={`${data.songTitle} album art`}
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
            —
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm md:text-base font-semibold font-serif text-foreground" title={data.songTitle}>
            {data.songTitle}
          </div>
          {data.artistName && (
            <div className="truncate text-xs text-muted-foreground" title={data.artistName} onClick={(e) => e.stopPropagation()}>
              <ArtistLink name={data.artistName} slug={slugifyBase(data.artistName).slice(0, 80)} className="text-muted-foreground" />
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {data.heard && (
              <Badge variant="heard" shape="pill">
                <Headphones size={12} />
                heard
              </Badge>
            )}
            {data.liked && (
              <Badge variant="like" shape="pill">
                <Heart size={12} />
                liked
              </Badge>
            )}
            {data.disliked && (
              <Badge variant="dislike" shape="pill">
                <ThumbsDown size={12} />
                disliked
              </Badge>
            )}
            {data.reviewed && (
              <Badge variant="review" shape="pill">
                <Pencil size={12} />
                reviewed
              </Badge>
            )}
            {data.want && (
              <Badge variant="want" shape="pill">
                <Circle size={12} />
                want
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
