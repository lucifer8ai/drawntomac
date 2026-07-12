import { useEffect, useState, useCallback } from "react";
import type { CompatibleUser } from "@/hooks/useCompatibleUsers";
import { computeCompatibilityScore, getCompatibilityTier } from "@/utils/compatibility";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    <div className="flex items-center gap-3 rounded-xl border bg-raised p-3">
      <div className="h-12 w-12 rounded-full flex-shrink-0 animate-skeleton" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-1/3 rounded animate-skeleton" />
        <div className="h-3 w-1/2 rounded animate-skeleton" />
      </div>
    </div>
  );
}

function UserCard({
  user,
  maxScore,
  currentUserId,
  followState,
  onToggleFollow,
}: {
  user: CompatibleUser;
  maxScore: number;
  currentUserId: string | null;
  followState: Record<string, boolean>;
  onToggleFollow: (userId: string) => void;
}) {
  const score = computeCompatibilityScore(user);
  const tier = getCompatibilityTier(score, maxScore);
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  const whyPreview = buildWhyPreview(user);

  const total = user.sharedSongs;
  const heardPct = total > 0 ? (user.sharedHeard / total) * 100 : 0;
  const likedPct = total > 0 ? (user.sharedLiked / total) * 100 : 0;
  const reviewedPct = total > 0 ? (user.sharedReviewed / total) * 100 : 0;
  const wantPct = total > 0 ? (user.sharedWant / total) * 100 : 0;

  const activityLabel = user.lastActiveAt
    ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true })
    : null;

  const isOwnCard = currentUserId === user.userId;
  const isFollowing = followState[user.userId] ?? false;

  return (
    <Link
      to="/user/$username"
      params={{ username: user.username }}
      className="block rounded-xl border bg-raised p-3 transition-colors hover:border-foreground/12"
    >
      <div className="flex items-start gap-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.displayName ?? user.username} avatar`}
            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {(user.displayName ?? user.username)[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {user.displayName ?? user.username}
            </span>
            {tier && (
              <span
                className="flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${tier.color}20`, color: tier.color }}
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
              <div className="flex h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-muted-foreground/30"
                  style={{ width: `${heardPct}%` }}
                />
                <div
                  className="bg-primary"
                  style={{ width: `${likedPct}%` }}
                />
                <div
                  className="bg-[#a855f7]"
                  style={{ width: `${reviewedPct}%` }}
                />
                <div
                  className="bg-muted-foreground/50"
                  style={{ width: `${wantPct}%` }}
                />
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                Heard {user.sharedHeard} · Liked {user.sharedLiked} · Reviewed {user.sharedReviewed}
              </div>
            </div>
          )}
          {activityLabel && (
            <div className="mt-1 text-[11px] text-muted-foreground">{activityLabel}</div>
          )}
          {user.topSharedArtist && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Into: <span className="text-foreground">{user.topSharedArtist}</span>
            </div>
          )}
        </div>
        {currentUserId && !isOwnCard && (
          <button
            type="button"
            aria-label={isFollowing ? `Unfollow @${user.username}` : `Follow @${user.username}`}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFollow(user.userId);
            }}
            className={`rounded-lg px-3 py-2 text-[11px] font-medium min-h-[44px] min-w-[44px]
              border transition-all duration-200 active:scale-[0.97] focus-visible:ring-1 focus-visible:ring-ring flex-shrink-0
              ${isFollowing
                ? "border-border/30 bg-raised text-muted-foreground hover:bg-white/[0.05]"
                : "border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
    </Link>
  );
}

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

  const handleToggleFollow = useCallback(async (targetId: string) => {
    if (!currentUserId) return;
    const currentlyFollowing = followState[targetId] ?? false;
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
    }
  }, [currentUserId, followState]);

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
      <div className="text-center py-8">
        {diaryCount === 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">
              Log your first song to find people who share your taste.
            </p>
            <button
              type="button"
              onClick={onSearch}
              className="text-xs font-medium text-primary underline"
            >
              Search for a song →
            </button>
          </>
        ) : diaryCount < 5 ? (
          <p className="text-sm text-muted-foreground">
            Heard {diaryCount} songs. Hear {5 - diaryCount} more to unlock compatible listeners.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No compatible listeners found yet. More people join every day.
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
            followState={followState}
            onToggleFollow={handleToggleFollow}
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
