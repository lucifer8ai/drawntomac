import { useEffect } from "react";
import { useFeed } from "@/hooks/useFeed";
import { FeedTimeline } from "./FeedTimeline";
import { EmptyFeedState } from "./EmptyFeedState";
import { PartialErrorBanner } from "./PartialErrorBanner";
import { NewActivityPill } from "./NewActivityPill";
import { Button } from "@/components/ui/button";

export function FeedPage() {
  const {
    pages,
    loadMore,
    refresh,
    loading,
    error,
    partialError,
    isEmpty,
    followingCount,
    hasMore,
    newActivityCount,
    dismissNewActivity,
  } = useFeed();

  // Infinite scroll
  useEffect(() => {
    function handleScroll() {
      if (!hasMore || loading) return;
      const scrollPos = window.innerHeight + window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      if (pageHeight < window.innerHeight * 1.5) return;
      if (scrollPos >= pageHeight * 0.8) {
        loadMore();
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, loadMore]);

  function handleScrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    dismissNewActivity();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="mb-3 h-20 rounded-xl animate-skeleton"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Something went wrong loading your feed.</p>
        <Button variant="secondary" size="sm" shape="pill" className="mt-3" onClick={refresh}>
          Try again
        </Button>
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyFeedState followingCount={followingCount} />;
  }

  return (
    <>
      <NewActivityPill
        count={newActivityCount}
        onScrollToTop={handleScrollToTop}
        onDismiss={dismissNewActivity}
      />
      <FeedTimeline pages={pages} />
      {partialError && (
        <PartialErrorBanner
          message={partialError}
          onRetry={loadMore}
        />
      )}
      {hasMore && !partialError && (
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <div className="h-6 w-24 mx-auto rounded animate-skeleton" />
        </div>
      )}
      {!hasMore && pages.flat().length > 0 && (
        <div className="mx-auto max-w-2xl px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
        </div>
      )}
    </>
  );
}
