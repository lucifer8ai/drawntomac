import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompatibleUsersList } from "@/components/feed/CompatibleUsersList";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={params ? `/${to.replace("$", "")}${params.username}` : "/"} className={className}>{children}</a>
  ),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

describe("CompatibleUsersList", () => {
  const baseUser = {
    userId: "u1",
    username: "alice",
    displayName: "Alice",
    avatarUrl: null,
    sharedSongs: 7,
    sharedHeard: 3,
    sharedLiked: 2,
    sharedDisliked: 0,
    sharedWant: 1,
    sharedReviewed: 1,
    likedSongs: ["Track A", "Track B"],
    wantSongs: ["Track C"],
    lastActiveAt: "2026-07-10T00:00:00Z",
    topSharedArtist: "Kendrick Lamar",
  };

  const defaultProps = {
    users: [] as typeof baseUser[],
    loading: false,
    error: null as string | null,
    retry: () => {},
    isEmpty: false,
    isAnonymous: false,
    hasMore: false,
    onShowMore: () => {},
    loadingMore: false,
    diaryCount: 10,
    maxScore: 0,
    onSearch: () => {},
    currentUserId: null as string | null,
  };

  it("returns null when anonymous", () => {
    const { container } = render(
      <CompatibleUsersList {...defaultProps} isAnonymous />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders loading skeletons", () => {
    render(
      <CompatibleUsersList {...defaultProps} loading />
    );
    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error with retry button", () => {
    const retry = vi.fn();
    render(
      <CompatibleUsersList {...defaultProps} error="Oops" retry={retry} />
    );
    expect(screen.getByText("Oops")).toBeTruthy();
    screen.getByText("Try Again").click();
    expect(retry).toHaveBeenCalled();
  });

  it("shows diaryCount 0 empty state", () => {
    const onSearch = vi.fn();
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={0} onSearch={onSearch} />
    );
    expect(screen.getByText(/Log your first song/)).toBeTruthy();
    expect(screen.getByText(/Search for a song/)).toBeTruthy();
    screen.getByText(/Search for a song/).click();
    expect(onSearch).toHaveBeenCalled();
  });

  it("shows progress nudge for 1-4 diary entries", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={3} />
    );
    expect(screen.getByText(/Hear 2 more/)).toBeTruthy();
  });

  it("shows no matches message for 5+ diary entries", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={5} />
    );
    expect(screen.getByText(/No compatible listeners found yet/)).toBeTruthy();
  });

  it("renders mobile cards with user data", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={7.5} />
    );
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText(/Both liked/)).toBeTruthy();
    expect(screen.getByText(/Track A/)).toBeTruthy();
    expect(screen.getByText(/Into:/)).toBeTruthy();
    expect(screen.getByText("Kendrick Lamar")).toBeTruthy();
  });

  it("shows avatar or initial", () => {
    const withAvatar = { ...baseUser, avatarUrl: "http://img.com/av.jpg" };
    render(
      <CompatibleUsersList {...defaultProps} users={[withAvatar]} maxScore={10} />
    );
    const img = document.querySelector("img[src='http://img.com/av.jpg']");
    expect(img).toBeTruthy();
  });

  it("falls back to username when no display name", () => {
    const noDisplay = { ...baseUser, displayName: null, username: "bob123" };
    render(
      <CompatibleUsersList {...defaultProps} users={[noDisplay]} maxScore={10} />
    );
    expect(screen.getByText("bob123")).toBeTruthy();
  });

  it("shows taste bars with breakdown", () => {
    const tasteUser = { ...baseUser, sharedHeard: 4, sharedLiked: 2, sharedReviewed: 1 };
    render(
      <CompatibleUsersList {...defaultProps} users={[tasteUser]} />
    );
    expect(screen.getByText(/Heard 4/)).toBeTruthy();
    expect(screen.getByText(/Liked 2/)).toBeTruthy();
    expect(screen.getByText(/Reviewed 1/)).toBeTruthy();
  });

  it("shows tier badge when maxScore >= 10", () => {
    const highMatch = { ...baseUser, sharedHeard: 2, sharedLiked: 5, sharedReviewed: 3, sharedWant: 2, sharedDisliked: 0 };
    render(
      <CompatibleUsersList {...defaultProps} users={[highMatch]} maxScore={25} />
    );
    expect(screen.getByText(/Taste Twin/)).toBeTruthy();
  });

  it("hides tier badge when maxScore < 10", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={7} />
    );
    expect(screen.queryByText(/Taste Twin/)).toBeFalsy();
    expect(screen.queryByText(/Match/)).toBeFalsy();
  });

  it("shows 'Show more' when hasMore is true", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} hasMore />
    );
    expect(screen.getByText("Show more")).toBeTruthy();
  });

  it("renders inline follow button when currentUserId is provided", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} currentUserId="viewer-1" />
    );
    expect(screen.getByRole("button", { name: /Follow @alice/ })).toBeTruthy();
  });

  it("hides follow button for own card", () => {
    const ownUser = { ...baseUser, userId: "viewer-1" };
    render(
      <CompatibleUsersList {...defaultProps} users={[ownUser]} maxScore={10} currentUserId="viewer-1" />
    );
    expect(screen.queryByRole("button", { name: /Follow/ })).toBeFalsy();
  });
});
