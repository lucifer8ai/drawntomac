import { useEffect, useState, useCallback, useRef, memo } from "react";
import type { CompatibleUser } from "@/hooks/useCompatibleUsers";
import { computeCompatibilityScore, getCompatibilityTier } from "@/utils/compatibility";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface CompatibleUsersListProps {
  users: CompatibleUser[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  isEmpty: boolean;
  isAnonymous: boolean;
  hasMore: boolean;
  onShowMore: () => void;
  loadingMore: boolean;
  diaryCount: number;
  maxScore: number;
  onSearch: () => void;
  currentUserId: string | null;
}

function UserSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-raised p-3">
      <div className="h-10 w-10 rounded-full flex-shrink-0 animate-skeleton" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-1/3 rounded animate-skeleton" />
        <div className="h-3 w-1/2 rounded animate-skeleton" />
      </div>
    </div>
  );
}

function getTierColor(tier: ReturnType<typeof getCompatibilityTier>): string {
  if (!tier) return "var(--color-tier-good)";
  switch (tier.label) {
    case "Taste Twin": return "var(--color-tier-twin)";
    case "High Match": return "var(--color-tier-high)";
    default: return "var(--color-tier-good)";
  }
}

interface UserCardProps {
  user: CompatibleUser;
  maxScore: number;
  currentUserId: string | null;
  isFollowing: boolean;
  isFollowLoading: boolean;
  onToggleFollow: (userId: string) => void;
}

const UserCard = memo(function UserCard({
  user,
  maxScore,
  currentUserId,
  isFollowing,
  isFollowLoading,
  onToggleFollow,
}: UserCardProps) {
  const score = computeCompatibilityScore(user);
  const tier = getCompatibilityTier(score, maxScore);
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const tierColor = getTierColor(tier);

  const whyPreview = buildWhyPreview(user);

  const total = user.sharedSongs;
  const heardPct = total > 0 ? (user.sharedHeard / total) * 100 : 0;
  const likedPct = total > 0 ? (user.sharedLiked / total) * 100 : 0;
  const reviewedPct = total > 0 ? (user.sharedReviewed / total) * 100 : 0;
  const wantPct = total > 0 ? (user.sharedWant / total) * 100 : 0;

  const isOwnCard = currentUserId === user.userId;
  const displayName = user.displayName ?? user.username;

  return (
    <Link
      to="/user/$username"
      params={{ username: user.username }}
      className="block rounded-2xl border bg-raised p-3 transition-colors hover:border-foreground/12"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 flex-shrink-0">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={`${displayName} avatar`} />
          ) : null}
          <AvatarFallback className="text-sm font-bold">
            {displayName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
            {tier && (
              <span
                className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
              >
                {tier.label} ({pct}%)
              </span>
            )}
          </div>

          {whyPreview && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{whyPreview}</div>
          )}

          {total > 0 && (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-1.5 flex-1 rounded-full overflow-hidden">
                  <div className="bg-[var(--color-heard)]/30" style={{ width: `${heardPct}%` }} />
                  <div className="bg-[var(--color-like)]" style={{ width: `${likedPct}%` }} />
                  <div className="bg-[var(--color-save)]" style={{ width: `${reviewedPct}%` }} />
                  <div className="bg-muted-foreground/50" style={{ width: `${wantPct}%` }} />
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                  {pct}% match
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Heard {user.sharedHeard} · Liked {user.sharedLiked} · Reviewed {user.sharedReviewed}
              </div>
            </div>
          )}
        </div>

        {currentUserId && !isOwnCard && (
          isFollowing ? (
            <Button
              type="button"
              variant="raised"
              size="sm"
              shape="pill"
              disabled={isFollowLoading}
              aria-label={`Unfollow @${user.username}`}
              className="text-muted-foreground flex-shrink-0 min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFollow(user.userId);
              }}
            >
              {isFollowLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Following"
              )}
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              shape="pill"
              disabled={isFollowLoading}
              aria-label={`Follow @${user.username}`}
              className="flex-shrink-0 min-h-[44px] min-w-[44px]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFollow(user.userId);
              }}
            >
              {isFollowLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Follow"
              )}
            </Button>
          )
        )}
      </div>
    </Link>
  );
});

function buildWhyPreview(user: CompatibleUser): string | null {
  if (user.likedSongs.length > 0) {
    return `Both liked: ${user.likedSongs.slice(0, 2).join(", ")}`;
  }
  if (user.sharedReviewed > 0) {
    return `Both reviewed ${user.sharedReviewed} songs`;
  }
  if (user.wantSongs.length > 0) {
    return `Both want: ${user.wantSongs.slice(0, 2).join(", ")}`;
  }
  if (user.sharedSongs > 0) {
    return `Both heard ${user.sharedSongs} songs`;
  }
  return null;
}

export function CompatibleUsersList({
  users,
  loading,
  error,
  retry,
  isEmpty,
  isAnonymous,
  hasMore,
  onShowMore,
  loadingMore,
  diaryCount,
  maxScore,
  onSearch,
  currentUserId,
}: CompatibleUsersListProps) {
  const [followState, setFollowState] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  // Stable callback ref — prevents re-rendering memoized UserCards
  const onToggleFollowRef = useRef<(userId: string) => void>(() => {});
  const followStateRef = useRef(followState);
  followStateRef.current = followState;

  onToggleFollowRef.current = useCallback(async (targetId: string) => {
    if (!currentUserId) return;
    const currentlyFollowing = followStateRef.current[targetId] ?? false;

    setFollowLoading((prev) => ({ ...prev, [targetId]: true }));
    setFollowState((prev) => ({ ...prev, [targetId]: !currentlyFollowing }));

    try {
      if (currentlyFollowing) {
        const { error: delErr } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetId);
        if (delErr) throw delErr;
      } else {
        const { error: insErr } = await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetId });
        if (insErr) throw insErr;
      }
    } catch {
      setFollowState((prev) => ({ ...prev, [targetId]: currentlyFollowing }));
      toast.error("Couldn't update follow status. Try again.");
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetId]: false }));
    }
  }, [currentUserId]);

  // Batch-check follow status when users list changes
  useEffect(() => {
    if (!currentUserId || users.length === 0) return;
    const userIds = users.map((u) => u.userId);
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId)
      .in("following_id", userIds)
      .then(({ data, error }) => {
        if (error || !data) return;
        const followed = new Set(data.map((r: any) => r.following_id));
        setFollowState((prev) => {
          const next = { ...prev };
          for (const uid of userIds) {
            next[uid] = followed.has(uid);
          }
          return next;
        });
      });
  }, [currentUserId, users]);

  if (isAnonymous) return null;

  if (loading && users.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <UserSkeleton key={i} />
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
      <div className="text-center py-10">
        {diaryCount === 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Log your first song and we'll find people who share your taste.
            </p>
            <button
              type="button"
              onClick={onSearch}
              className="text-sm font-medium text-primary underline"
            >
              Search for a song →
            </button>
          </>
        ) : diaryCount < 3 ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Almost there — {3 - diaryCount} more {3 - diaryCount === 1 ? "song" : "songs"} and we'll introduce you to people who share your taste.
            </p>
            <button
              type="button"
              onClick={onSearch}
              className="text-sm font-medium text-primary underline"
            >
              Search for a song →
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            More people join every day — we're always looking for your taste twins.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {users.map((user) => (
          <UserCard
            key={user.userId}
            user={user}
            maxScore={maxScore}
            currentUserId={currentUserId}
            isFollowing={followState[user.userId] ?? false}
            isFollowLoading={followLoading[user.userId] ?? false}
            onToggleFollow={onToggleFollowRef.current}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={onShowMore}
          disabled={loadingMore}
          className="mt-3 w-full rounded-lg border py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.03] disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Show more"}
        </button>
      )}
    </div>
  );
}
