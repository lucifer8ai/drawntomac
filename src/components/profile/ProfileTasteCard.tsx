import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ProfileTasteStats } from "@/hooks/useProfileStats";
import { deriveTasteInsight } from "@/lib/taste-insight";
import { getTastePercentage, type BarType } from "@/lib/taste-thresholds";

interface ProfileTasteCardProps {
  stats: ProfileTasteStats;
  loading: boolean;
  error: string | null;
  isOwnProfile: boolean;
  username: string;
  onRetry?: () => void;
}

const BAR_COLORS: Record<BarType, { track: string; fill: string }> = {
  heard: { track: "bg-[--color-heard]/10", fill: "bg-[--color-heard]" },
  liked: { track: "bg-[--color-like]/10", fill: "bg-[--color-like]" },
  want: { track: "bg-[--color-want]/10", fill: "bg-[--color-want]" },
  disliked: { track: "bg-[--color-dislike]/10", fill: "bg-[--color-dislike]" },
  review: { track: "bg-[--color-save]/10", fill: "bg-[--color-save]" },
};

const BAR_LABELS: Record<BarType, string> = {
  heard: "Heard",
  liked: "Liked",
  disliked: "Disliked",
  want: "Want",
  review: "Reviewed",
};

function barAriaLabel(stats: ProfileTasteStats): string {
  return `Taste bars: Heard ${getTastePercentage("heard", stats.heard)}%, Liked ${getTastePercentage("liked", stats.liked)}%, Disliked ${getTastePercentage("disliked", stats.disliked)}%, Want ${getTastePercentage("want", stats.want)}%, Reviewed ${getTastePercentage("review", stats.review)}%`;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border bg-raised px-6 py-5 space-y-3">
      <div className="h-4 w-24 animate-skeleton rounded" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-skeleton rounded" />
        <div className="h-4 w-3/4 animate-skeleton rounded" />
      </div>
      <div className="space-y-2.5 mt-4">
        {[80, 60, 40, 20].map((width) => (
          <div key={width} className="flex items-center gap-3">
            <div className="w-14 h-3 animate-skeleton rounded" />
            <div
              className="flex-1 h-2 rounded-full animate-skeleton"
              style={{ maxWidth: `${width}%` }}
            />
            <div className="w-10 h-4 animate-skeleton rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border bg-raised px-6 py-5 space-y-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
        Taste profile
      </span>
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-light text-muted-foreground">
          Couldn't load taste stats.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-ring rounded-lg min-h-[44px] min-w-[44px] flex items-center"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function TasteBarChart({ stats }: { stats: ProfileTasteStats }) {
  const barTypes: BarType[] = ["heard", "liked", "disliked", "want", "review"];

  const [animated, setAnimated] = useState(false);
  const mounted = useRef(false);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (reducedMotion) {
      setAnimated(true);
      return;
    }
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  const BAR_DELAYS: Record<BarType, number> = {
    heard: 0,
    liked: 75,
    disliked: 225,
    want: 150,
    review: 300,
  };

  return (
    <div
      className="space-y-2.5 mt-4"
      role="img"
      aria-label={barAriaLabel(stats)}
    >
      {barTypes.map((type) => {
        const percentage = getTastePercentage(type, stats[type]);
        const colors = BAR_COLORS[type];
        const delay = reducedMotion ? 0 : BAR_DELAYS[type];
        return (
          <div key={type} className="flex items-center gap-3">
            <span className="w-14 text-xs font-semibold text-muted-foreground text-right shrink-0">
              {BAR_LABELS[type]}
            </span>
            <span
              className="w-0.5 h-4 shrink-0"
              style={{
                backgroundColor: `var(--color-${type === "disliked" ? "dislike" : type === "liked" ? "like" : type === "review" ? "save" : type})`,
              }}
              aria-hidden="true"
            />
            <div
              className={`flex-1 h-2 rounded-full overflow-hidden ${colors.track}`}
            >
              <div
                className={`h-full rounded-full ${colors.fill}`}
                style={{
                  width: animated ? `${percentage}%` : "0%",
                  transition: `width 400ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                }}
              />
            </div>
            <span
              className="w-10 text-base font-semibold tabular-nums text-foreground text-right shrink-0"
              title={`${stats[type]} ${stats[type] === 1 ? "song" : "songs"}`}
            >
              {percentage}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ActiveCard({
  stats,
  username,
  isOwnProfile,
}: {
  stats: ProfileTasteStats;
  username: string;
  isOwnProfile: boolean;
}) {
  const insight = deriveTasteInsight(stats);

  const heard = stats.heard;
  const liked = stats.liked;
  const want = stats.want;
  const total = heard + liked + stats.disliked + want + stats.review;

  const allZero =
    heard === 0 && liked === 0 && stats.disliked === 0 && want === 0 && stats.review === 0;

  const narrativeParts: string[] = [];
  narrativeParts.push(`logged ${total} ${total === 1 ? "entry" : "entries"}`);

  const subject = `@${username}`;

  return (
    <div className="rounded-2xl border bg-raised px-6 py-5 space-y-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.15em]">
        Taste profile
      </span>

      {allZero ? (
        isOwnProfile ? (
          <div className="space-y-2">
            <p className="text-base font-light text-foreground/90 leading-relaxed">
              Your taste profile is waiting. Log a song — heard, liked,
              want-to-hear — and these bars will start filling.
            </p>
            <Link
              to="/home"
              className="inline-flex items-center px-5 h-9 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity active:scale-[0.97]"
            >
              Explore music
            </Link>
          </div>
        ) : (
          <p className="text-base font-light text-foreground/90 leading-relaxed">
            {subject}'s taste profile is a blank slate. Their musical journey
            hasn't been logged yet.
          </p>
        )
      ) : (
        <>
          <p className="text-base font-light leading-relaxed text-foreground/90">
            {subject} has {narrativeParts.join(", ")}.
          </p>
          {insight && (
            <p className="text-sm font-light text-muted-foreground italic leading-relaxed">
              {insight}
            </p>
          )}
        </>
      )}

      <TasteBarChart stats={stats} />
    </div>
  );
}

export function ProfileTasteCard({
  stats,
  loading,
  error,
  isOwnProfile,
  username,
  onRetry,
}: ProfileTasteCardProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorCard onRetry={onRetry} />;
  }

  return (
    <ActiveCard stats={stats} username={username} isOwnProfile={isOwnProfile} />
  );
}
