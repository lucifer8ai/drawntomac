import { Link } from "@tanstack/react-router";
import type { TrendingSong } from "@/hooks/useTrendingSongs";
import { CheckCircle, Heart, Star, X } from "lucide-react";

interface TrendingListProps {
  songs: TrendingSong[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isEmpty: boolean;
  emptyMessage?: string;
  socialProof: Map<string, number>;
  userInteractions: Map<string, Set<string>>;
  currentUserId: string | null;
  onSearch?: () => void;
}

function SongSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-raised p-3">
      <div className="h-12 w-12 rounded-lg flex-shrink-0 animate-skeleton" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-2/3 rounded animate-skeleton" />
        <div className="h-3 w-1/3 rounded animate-skeleton" />
      </div>
    </div>
  );
}

function whyTrending(song: TrendingSong): string {
  if (song.likeCount >= song.reviewCount && song.likeCount >= song.heardCount)
    return `${song.likeCount} people liked this this week`;
  if (song.reviewCount >= song.likeCount)
    return `${song.reviewCount} new reviews`;
  return `${song.heardCount} people heard this for the first time`;
}

function YourTakeBadge({ songId, interactions }: { songId: string; interactions: Map<string, Set<string>> }) {
  const types = interactions.get(songId);
  if (!types) return null;

  const size = 14;
  const badgeClass = "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-background p-px";

  if (types.has("like")) {
    return (
      <span className={badgeClass}>
        <Heart size={size} className="text-red-500 fill-red-500" />
      </span>
    );
  }
  if (types.has("heard")) {
    return (
      <span className={badgeClass}>
        <CheckCircle size={size} className="text-green-500 fill-green-500" />
      </span>
    );
  }
  if (types.has("want")) {
    return (
      <span className={badgeClass}>
        <Star size={size} className="text-purple-500 fill-purple-500" />
      </span>
    );
  }
  if (types.has("dislike")) {
    return (
      <span className={badgeClass}>
        <X size={size} className="text-muted-foreground" />
      </span>
    );
  }
  return null;
}

export function TrendingList({
  songs,
  loading,
  error,
  retry,
  isEmpty,
  emptyMessage,
  socialProof,
  userInteractions,
  currentUserId,
  onSearch,
}: TrendingListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SongSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm mb-3 text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground mb-3">
          {emptyMessage ?? "Nothing here yet."}
        </p>
        {onSearch && (
          <button
            type="button"
            onClick={onSearch}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
          >
            Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Mobile card layout */}
      <div className="md:hidden space-y-2">
        {songs.map((song, i) => {
          const rank = i + 1;
          const rankGlow = rank <= 3 ? "text-primary" : "text-muted-foreground";
          const matchCount = socialProof.get(song.id);
          return (
            <Link
              key={song.id}
              to="/song/$slug"
              params={{ slug: song.slug }}
              className="flex items-start gap-3 rounded-xl border bg-raised p-3 transition-colors hover:border-foreground/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative flex-shrink-0">
                {song.albumArtUrl ? (
                  <img
                    src={song.albumArtUrl}
                    alt={`${song.title} album art`}
                    className="h-12 w-12 rounded-lg object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    —
                  </div>
                )}
                <span
                  className={`absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ${
                    rank <= 3 ? "ring-2 ring-primary/30" : ""
                  }`}
                >
                  {rank}
                </span>
                <YourTakeBadge songId={song.id} interactions={userInteractions} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground" title={song.title}>
                  {song.title}
                </div>
                {song.artistName && (
                  <div className="truncate text-xs text-muted-foreground" title={song.artistName}>
                    {song.artistName}
                  </div>
                )}
                <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                  {whyTrending(song)}
                </div>
                {matchCount && matchCount > 0 && currentUserId && (
                  <div className="mt-0.5 text-[11px] text-primary/80">
                    {matchCount} of your matches {matchCount === 1 ? "likes" : "like"} this
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-hidden rounded-xl border bg-raised">
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground">
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Song</span>
          <span className="w-12 text-center">Take</span>
          <span className="w-24 text-right">Why</span>
          <span className="w-16 text-right">Likes</span>
          <span className="w-16 text-right">Heard</span>
          <span className="w-16 text-right">Reviews</span>
        </div>
        {songs.map((song, i) => {
          const rank = i + 1;
          const matchCount = socialProof.get(song.id);
          const types = userInteractions.get(song.id);
          return (
            <Link
              key={song.id}
              to="/song/$slug"
              params={{ slug: song.slug }}
              className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                i < songs.length - 1 ? "border-b" : ""
              }`}
            >
              <span
                className={`w-8 text-center text-xs ${
                  rank <= 3 ? "font-bold text-primary" : "text-muted-foreground"
                }`}
              >
                {rank}
              </span>
              <div className="flex flex-1 items-center gap-3 min-w-0">
                {song.albumArtUrl ? (
                  <img
                    src={song.albumArtUrl}
                    alt={`${song.title} album art`}
                    className="h-8 w-8 flex-shrink-0 rounded object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground" title={song.title}>
                    {song.title}
                  </div>
                  {song.artistName && (
                    <div className="truncate text-xs text-muted-foreground" title={song.artistName}>
                      {song.artistName}
                    </div>
                  )}
                  {matchCount && matchCount > 0 && currentUserId && (
                    <div className="text-[11px] text-primary/80">
                      {matchCount} match{matchCount !== 1 ? "es" : ""} like this
                    </div>
                  )}
                </div>
              </div>
              <span className="w-12 text-center">
                {types?.has("like") && <Heart size={14} className="inline text-red-500 fill-red-500" />}
                {types?.has("heard") && !types.has("like") && (
                  <CheckCircle size={14} className="inline text-green-500 fill-green-500" />
                )}
                {types?.has("want") && !types.has("like") && !types.has("heard") && (
                  <Star size={14} className="inline text-purple-500 fill-purple-500" />
                )}
                {types?.has("dislike") && !types.has("like") && !types.has("heard") && !types.has("want") && (
                  <X size={14} className="inline text-muted-foreground" />
                )}
                {!types && (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
              <span className="w-24 text-right text-[11px] text-muted-foreground/80">
                {whyTrending(song)}
              </span>
              <span className="w-16 text-right text-muted-foreground">
                {song.likeCount > 0 ? (
                  <span className="font-semibold text-primary">{song.likeCount}</span>
                ) : "—"}
              </span>
              <span className="w-16 text-right text-muted-foreground">
                {song.heardCount > 0 ? song.heardCount : "—"}
              </span>
              <span className="w-16 text-right text-muted-foreground">
                {song.reviewCount > 0 ? song.reviewCount : "—"}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
