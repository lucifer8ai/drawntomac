import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useTabContext } from "@/routes/_authenticated/route";
import { useTrendingSongs } from "@/hooks/useTrendingSongs";
import { useCompatibleUsers, type SortMode, type CompatibleUser } from "@/hooks/useCompatibleUsers";
import { useConnectingSongs } from "@/hooks/useConnectingSongs";
import { useTopMovers } from "@/hooks/useTopMovers";
import { useTrendingSocialProof } from "@/hooks/useTrendingSocialProof";
import { useDiaryInteractions } from "@/hooks/useDiaryInteractions";
import { TrendingList } from "@/components/feed/TrendingList";
import { CompatibleUsersList } from "@/components/feed/CompatibleUsersList";
import { ConnectingSongsSection } from "@/components/feed/ConnectingSongsSection";
import { TopMoversStrip } from "@/components/feed/TopMoversStrip";
import { computeCompatibilityScore } from "@/utils/compatibility";

export function DiscoverPage() {
  const { triggerSearch, discoverSection, setDiscoverSection } = useTabContext();
  const [userId, setUserId] = useState<string | null>(null);
  const [compatSort, setCompatSort] = useState<SortMode>("composite");
  const [compatPage, setCompatPage] = useState(0);
  const [allUsers, setAllUsers] = useState<CompatibleUser[]>([]);
  const [trendingWindow, setTrendingWindow] = useState<number>(30);

  const trending = useTrendingSongs(trendingWindow);
  const compatibleUsers = useCompatibleUsers(userId, compatSort, compatPage);
  const connectingSongs = useConnectingSongs(userId);
  const topMovers = useTopMovers();
  const { socialProof } = useTrendingSocialProof(userId, trending.songs.map((s) => s.id));
  const { interactions: userInteractions } = useDiaryInteractions(userId, trending.songs.map((s) => s.id));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (compatPage === 0) {
      setAllUsers(compatibleUsers.users);
    } else {
      setAllUsers((prev) => [...prev, ...compatibleUsers.users]);
    }
  }, [compatibleUsers.users, compatPage]);

  // ── END AUTH ──

  const isAnonymous = userId === null;
  const maxScore = allUsers.length > 0 ? Math.max(...allUsers.map((u) => computeCompatibilityScore(u))) : 0;

  return (
    <div className="mx-auto max-w-full px-2 md:max-w-4xl md:px-4 py-4 pb-20">
      {/* ── SUBSECTION TOGGLE ── */}
      {!isAnonymous && (
        <div className="flex gap-1 mb-6" role="tablist" aria-label="Discover sections">
          {(
            [
              { section: "trending" as const, label: "What's Hot" },
              { section: "people" as const, label: "People" },
            ]
          ).map(({ section, label }) => {
            const isActive = discoverSection === section;
            return (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setDiscoverSection(section)}
                className={`relative rounded-lg px-3 py-1.5 text-base font-medium min-h-[44px] min-w-[44px]
                  transition-colors duration-150
                  active:scale-[0.97] focus-visible:ring-1 focus-visible:ring-ring
                  ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── PEOPLE ── */}
      {!isAnonymous && (
        <section className={`mb-8 transition-opacity duration-150 ${discoverSection === "people" ? "" : "hidden"}`}>
          <div className="flex items-center justify-end mb-4">
            <div className="flex gap-1">
              {(
                [
                  { mode: "composite", label: "Best Match" },
                  { mode: "count", label: "Most Shared" },
                  { mode: "recent", label: "Recent" },
                ] as { mode: SortMode; label: string }[]
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setCompatSort(mode);
                    setCompatPage(0);
                  }}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    compatSort === mode
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <CompatibleUsersList
            users={allUsers}
            loading={compatibleUsers.loading && compatPage === 0}
            error={compatibleUsers.error}
            retry={compatibleUsers.retry}
            isEmpty={compatibleUsers.isEmpty}
            isAnonymous={isAnonymous}
            hasMore={compatibleUsers.hasMore}
            onShowMore={() => setCompatPage((p) => p + 1)}
            loadingMore={compatibleUsers.loading && compatPage > 0}
            diaryCount={compatibleUsers.diaryCount}
            maxScore={maxScore}
            onSearch={triggerSearch}
            currentUserId={userId}
          />
          {allUsers.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              You share tastes with {allUsers.length} {allUsers.length === 1 ? "listener" : "listeners"}.
            </div>
          )}
          {allUsers.length > 0 && (
            <div className="mt-6">
              <ConnectingSongsSection
                songs={connectingSongs.songs}
                loading={connectingSongs.loading}
              />
            </div>
          )}
        </section>
      )}

      {/* ── ANON CTA ── */}
      {isAnonymous && (
        <div className="mb-8 rounded-xl border bg-raised p-5 text-center">
          <p className="text-sm font-semibold mb-1">Find your people.</p>
          <p className="text-xs text-muted-foreground mb-3">
            drawnTo matches you with listeners who share your taste. Sign up to discover your taste twins.
          </p>
          <Link
            to="/"
            className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Sign Up
          </Link>
        </div>
      )}

      {/* ── WHAT'S HOT ── */}
      <section className={`transition-opacity duration-150 ${discoverSection === "trending" ? "" : "hidden"}`}>
        <div className="flex items-center justify-end mb-2">
          <div className="flex gap-1">
            {[
              { label: "Week", days: 7 },
              { label: "Month", days: 30 },
              { label: "All Time", days: 365 },
            ].map((w) => (
              <button
                key={w.days}
                type="button"
                onClick={() => setTrendingWindow(w.days)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  trendingWindow === w.days
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Movers strip */}
        <div className="mb-4">
          <TopMoversStrip
            songs={topMovers.songs}
            loading={topMovers.loading}
            error={topMovers.error}
          />
        </div>

        {/* Trending list */}
        <TrendingList
          songs={trending.songs}
          loading={trending.loading}
          error={trending.error}
          retry={trending.retry}
          isEmpty={trending.isEmpty}
          emptyMessage="No trending songs yet. Search for a song to get started."
          socialProof={socialProof}
          userInteractions={userInteractions}
          currentUserId={userId}
          onSearch={triggerSearch}
        />
      </section>
    </div>
  );
}
