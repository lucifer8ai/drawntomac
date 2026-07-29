import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedPage } from "@/components/feed/FeedPage";

const mockRefresh = vi.fn();

vi.mock("@/hooks/useFeed", () => ({
  useFeed: vi.fn(),
}));

vi.mock("@/hooks/useDiscoverFeed", () => ({
  useDiscoverFeed: vi.fn(),
}));

vi.mock("@/components/feed/DiscoverFeedSection", () => ({
  DiscoverFeedSection: () => <div data-testid="discover-feed" />,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/feed/FeedTimeline", () => ({
  FeedTimeline: () => <div data-testid="feed-timeline" />,
}));

vi.mock("@/components/feed/EmptyFeedState", () => ({
  EmptyFeedState: ({ followingCount }: any) => (
    <div data-testid="empty-feed">Empty (following: {followingCount})</div>
  ),
}));

vi.mock("@/components/feed/PartialErrorBanner", () => ({
  PartialErrorBanner: () => null,
}));

vi.mock("@/components/feed/NewActivityPill", () => ({
  NewActivityPill: () => null,
}));

describe("FeedPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRefresh.mockReset();
    const { useFeed } = await import("@/hooks/useFeed");
    (useFeed as any).mockReturnValue({
      pages: [],
      loading: false,
      error: null,
      partialError: null,
      isEmpty: true,
      followingCount: 3,
      hasMore: false,
      newActivityCount: 0,
      loadMore: vi.fn(),
      refresh: mockRefresh,
      dismissNewActivity: vi.fn(),
    });

    const { useDiscoverFeed } = await import("@/hooks/useDiscoverFeed");
    (useDiscoverFeed as any).mockReturnValue({
      feed: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("renders both discover feed and social feed sections", () => {
    render(<FeedPage />);
    expect(screen.getByTestId("discover-feed")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(<FeedPage />);
    expect(screen.getByTestId("empty-feed")).toBeTruthy();
  });

  it("shows error state with Try again button", async () => {
    const { useFeed } = await import("@/hooks/useFeed");
    (useFeed as any).mockReturnValue({
      pages: [],
      loading: false,
      error: "Something went wrong loading your feed.",
      partialError: null,
      isEmpty: false,
      followingCount: 5,
      hasMore: false,
      newActivityCount: 0,
      loadMore: vi.fn(),
      refresh: mockRefresh,
      dismissNewActivity: vi.fn(),
    });

    render(<FeedPage />);
    expect(
      screen.getByText("Something went wrong loading your feed."),
    ).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("calls refresh on Try again click", async () => {
    const { useFeed } = await import("@/hooks/useFeed");
    (useFeed as any).mockReturnValue({
      pages: [],
      loading: false,
      error: "Something went wrong loading your feed.",
      partialError: null,
      isEmpty: false,
      followingCount: 5,
      hasMore: false,
      newActivityCount: 0,
      loadMore: vi.fn(),
      refresh: mockRefresh,
      dismissNewActivity: vi.fn(),
    });

    render(<FeedPage />);
    await userEvent.click(screen.getByText("Try again"));
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("renders feed timeline when entries exist", async () => {
    const { useFeed } = await import("@/hooks/useFeed");
    (useFeed as any).mockReturnValue({
      pages: [[
        {
          entryId: "e1",
          userId: "u1",
          type: "heard",
          body: null,
          createdAt: "2026-07-12T00:00:00Z",
          songId: "s1",
          songTitle: "Test",
          songSlug: "test",
          artistName: null,
          albumArtUrl: null,
          username: "bob",
          displayName: "Bob",
          avatarUrl: null,
        },
      ]],
      loading: false,
      error: null,
      partialError: null,
      isEmpty: false,
      followingCount: 5,
      hasMore: false,
      newActivityCount: 0,
      loadMore: vi.fn(),
      refresh: mockRefresh,
      dismissNewActivity: vi.fn(),
    });

    render(<FeedPage />);
    expect(screen.getByTestId("feed-timeline")).toBeTruthy();
  });

  it("renders a separator between discover and social sections", () => {
    render(<FeedPage />);
    const separators = document.querySelectorAll(".h-px.bg-border");
    expect(separators.length).toBe(1);
  });
});
