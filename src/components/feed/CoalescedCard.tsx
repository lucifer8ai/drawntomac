import { Link } from "@tanstack/react-router";
import { Headphones, Heart, ThumbsDown, Pencil, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarStack, type AvatarUser } from "./AvatarStack";
import { ArtistLink } from "@/components/artist";
import { slugifyBase } from "@/lib/slugify";
import type { CoalescedGroup } from "./FeedTimeline";

const BADGE_MAX = 4;

const typeIcons: Record<string, React.ReactNode> = {
  heard: <Headphones size={12} />,
  like: <Heart size={12} />,
  dislike: <ThumbsDown size={12} />,
  review: <Pencil size={12} />,
  want: <Circle size={12} />,
};

const typeLabels: Record<string, string> = {
  heard: "heard",
  like: "liked",
  dislike: "disliked",
  review: "reviewed",
  want: "want",
};

const badgeVariants: Record<string, "heard" | "like" | "dislike" | "want"> = {
  heard: "heard",
  like: "like",
  dislike: "dislike",
  review: "like",
  want: "want",
};

function relativeTime(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w ago`;
  return `${Math.floor(weeks / 52)}y ago`;
}

interface CoalescedCardProps {
  group: CoalescedGroup;
}

export function CoalescedCard({ group }: CoalescedCardProps) {
  const avatarUsers: AvatarUser[] = group.users.map((u) => ({
    userId: u.userId,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: u.avatarUrl,
  }));

  // Collect unique types across all users
  const allTypes = [...new Set(group.users.flatMap((u) => u.types))];
  const visibleTypes = allTypes.slice(0, BADGE_MAX);
  const extraTypes = allTypes.length - BADGE_MAX;

  const artistSlug = group.artistName ? slugifyBase(group.artistName).slice(0, 80) : null;

  // Find the first review body with its author
  const reviewEntry = group.users.find((u) => u.bodies.length > 0);
  const reviewBody = reviewEntry?.bodies[0] as string | undefined;
  const reviewAuthor = reviewEntry
    ? (reviewEntry.displayName ?? reviewEntry.username)
    : null;

  return (
    <Link
      to="/song/$slug"
      params={{ slug: group.songSlug }}
      className="block transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <div className="flex gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <AvatarStack users={avatarUsers} maxVisible={4} />

          <div className="mt-1.5">
            <div className="text-base font-semibold text-foreground truncate" title={group.songTitle}>
              {group.songTitle}
            </div>
            {group.artistName && (
              <div className="text-xs text-muted-foreground truncate" title={group.artistName} onClick={(e) => e.stopPropagation()}>
                <ArtistLink name={group.artistName} slug={artistSlug} className="text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-2">
            {visibleTypes.map((type) => {
              const variant = badgeVariants[type];
              if (!variant) return null;
              return (
                <Badge key={type} variant={variant} shape="pill">
                  {typeIcons[type]}
                  {typeLabels[type]}
                </Badge>
              );
            })}
            {extraTypes > 0 && (
              <span className="text-xs text-muted-foreground self-center">
                +{extraTypes} more
              </span>
            )}
          </div>

          {reviewBody && (
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              &ldquo;{reviewBody}&rdquo; — {reviewAuthor}
            </div>
          )}

          <div className="mt-1 text-xs text-muted-foreground">
            {relativeTime(group.latestCreatedAt)}
          </div>
        </div>

        {group.albumArtUrl && (
          <img
            src={group.albumArtUrl}
            alt={`${group.songTitle} album art`}
            className="h-14 w-14 flex-shrink-0 rounded-lg object-cover"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </Link>
  );
}
