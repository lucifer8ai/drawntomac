import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompatibleUsersList } from "@/components/feed/CompatibleUsersList";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a
      href={params ? `/${params.username}` : "/"}
      className={className}
      data-testid="user-link"
    >
      {children}
    </a>
  ),
}));

const mockFromChain: any = {
  select: () => ({
    eq: () => ({
      in: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => mockFromChain,
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, variant, size, shape, disabled, className, onClick, ...props }: any) => (
    <button
      disabled={disabled}
      className={className}
      onClick={onClick}
      data-variant={variant}
      data-disabled={disabled ? "true" : "false"}
      {...props}
    >
      {children}
    </button>
  ),
  buttonVariants: () => "button-base",
}));

vi.mock("lucide-react", () => ({
  Loader2: ({ className }: any) => <span className={className} data-testid="spinner">⟳</span>,
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

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromChain;
  });

  // ── State tests ──

  it("returns null when anonymous", () => {
    const { container } = render(
      <CompatibleUsersList {...defaultProps} isAnonymous />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders loading skeletons", () => {
    render(<CompatibleUsersList {...defaultProps} loading />);
    expect(document.querySelectorAll(".animate-skeleton").length).toBeGreaterThan(0);
  });

  it("renders error with retry button", async () => {
    const retry = vi.fn();
    render(
      <CompatibleUsersList {...defaultProps} error="Something went wrong" retry={retry} />,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    await userEvent.click(screen.getByText("Try Again"));
    expect(retry).toHaveBeenCalled();
  });

  // ── Empty states (aspirational copy) ──

  it("shows aspirational empty state for 0 diary entries", async () => {
    const onSearch = vi.fn();
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={0} onSearch={onSearch} />,
    );
    expect(screen.getByText(/Log your first song and we'll find people/)).toBeTruthy();
    expect(screen.getByText(/Search for a song/)).toBeTruthy();
    await userEvent.click(screen.getByText(/Search for a song/));
    expect(onSearch).toHaveBeenCalled();
  });

  it("shows progress nudge for 1-4 diary entries", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={3} />,
    );
    expect(screen.getByText(/Almost there — 2 more songs/)).toBeTruthy();
  });

  it("shows 'more people join every day' for 5+ diary entries with no matches", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[]} isEmpty diaryCount={5} />,
    );
    expect(screen.getByText(/More people join every day/)).toBeTruthy();
  });

  // ── User card rendering ──

  it("renders username in card (primary over displayName)", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("falls back to username when no display name", () => {
    const noDisplay = { ...baseUser, displayName: null, username: "bob123" };
    render(
      <CompatibleUsersList {...defaultProps} users={[noDisplay]} maxScore={10} />,
    );
    expect(screen.getByText("bob123")).toBeTruthy();
  });

  it("shows avatar with image when avatarUrl exists", () => {
    const withAvatar = { ...baseUser, avatarUrl: "http://img.com/av.jpg" };
    render(
      <CompatibleUsersList {...defaultProps} users={[withAvatar]} maxScore={10} />,
    );
    const img = document.querySelector("img[src='http://img.com/av.jpg']");
    expect(img).toBeTruthy();
  });

  it("shows initial fallback when no avatarUrl", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    expect(screen.getByText("A")).toBeTruthy();
  });

  it("shows why-preview subtitle", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    expect(screen.getByText(/Both liked:/)).toBeTruthy();
    expect(screen.getByText(/Track A/)).toBeTruthy();
  });

  // ── Hero card (#1 user) ──

  it("renders hero card variant for first user", () => {
    const user2 = { ...baseUser, userId: "u2", username: "bob" };
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser, user2]} maxScore={10} />,
    );
    const links = screen.getAllByTestId("user-link");
    expect(links[0].className).toContain("p-4");
    expect(links[0].className).toContain("md:col-span-full");
    expect(links[1].className).toContain("p-3");
    expect(links[1].className).not.toContain("md:col-span-full");
  });

  it("renders hero card with larger avatar", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    const avatarEl = document.querySelector(".h-14.w-14");
    expect(avatarEl).toBeTruthy();
  });

  // ── Tier badge ──

  it("shows Tier badge when score qualifies", () => {
    const highMatch = {
      ...baseUser,
      sharedHeard: 2,
      sharedLiked: 5,
      sharedReviewed: 3,
      sharedWant: 2,
      sharedDisliked: 0,
    };
    render(
      <CompatibleUsersList {...defaultProps} users={[highMatch]} maxScore={25} />,
    );
    expect(screen.getByText(/Taste Twin/)).toBeTruthy();
  });

  it("hides tier badge when maxScore is low", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={7} />,
    );
    expect(screen.queryByText(/Match/)).toBeFalsy();
  });

  it("uses CSS variable colors for tier badges, not hardcoded hex", () => {
    const highMatch = {
      ...baseUser,
      sharedHeard: 2,
      sharedLiked: 5,
      sharedReviewed: 3,
      sharedWant: 2,
      sharedDisliked: 0,
    };
    render(
      <CompatibleUsersList {...defaultProps} users={[highMatch]} maxScore={25} />,
    );
    const badge = document.querySelector(".rounded-full.px-2.py-0\\.5");
    expect(badge).toBeTruthy();
    const style = badge!.getAttribute("style") || "";
    expect(style).toContain("var(--color-tier-");
    expect(style).not.toContain("#a855f7");
  });

  // ── Shared songs bar ──

  it("shows shared songs bar with match percentage", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    expect(screen.getByText(/Heard 3/)).toBeTruthy();
    expect(screen.getByText(/Liked 2/)).toBeTruthy();
    expect(screen.getByText(/Reviewed 1/)).toBeTruthy();
    expect(screen.getByText(/% match/)).toBeTruthy();
  });

  it("bar segments use CSS variables, not hardcoded colors", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    const bars = document.querySelectorAll(".rounded-full.overflow-hidden > div");
    bars.forEach((bar) => {
      const className = bar.className || "";
      const style = bar.getAttribute("style") || "";
      const hasCssVar = className.includes("bg-[var(--color-") || className.includes("bg-muted-foreground") || style.includes("var(--color-");
      expect(hasCssVar).toBeTruthy();
    });
    // No hardcoded #a855f7
    const allClasses = Array.from(bars).map((b) => b.className || "").join(" ");
    expect(allClasses).not.toContain("#a855f7");
  });

  // ── Follow button ──

  it("renders Follow button when currentUserId is provided and not own card", async () => {
    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Follow @alice/ })).toBeTruthy();
    });
  });

  it("hides follow button for own card", async () => {
    const ownUser = { ...baseUser, userId: "viewer-1" };
    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[ownUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Follow/ })).toBeFalsy();
    });
  });

  it("sends correct supabase follow request on click", async () => {
    const mockFromWithResponse = {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    vi.mocked(mockFromChain).from = undefined;
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromWithResponse;

    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    const btn = screen.getByRole("button", { name: /Follow @alice/ });
    await userEvent.click(btn);
    await waitFor(() => {
      expect(mockFromWithResponse.insert).toHaveBeenCalledWith({
        follower_id: "viewer-1",
        following_id: "u1",
      });
    });
  });

  // ── Follow button spinner ──

  it("shows spinner while follow request is in flight", async () => {
    // Make insert never resolve so spinner stays visible
    const mockFromSlow = {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => new Promise(() => {}),
    };
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromSlow;

    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Follow @alice/ }));
    expect(screen.getByTestId("spinner")).toBeTruthy();
  });

  it("disables follow button during request", async () => {
    // Mock that returns empty follow data (not followed) so button starts as "Follow"
    let insertedData: any = null;
    const mockFromSlow = {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: (data: any) => {
        insertedData = data;
        return new Promise(() => {}); // never resolves, spinner stays
      },
    };
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromSlow;

    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    // Wait for follow check to resolve (returned empty = not followed)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Follow @alice/ })).toBeTruthy();
    });
    await userEvent.click(screen.getByRole("button", { name: /Follow @alice/ }));
    // After click, button should now show Unfollow (optimistic toggle) + spinner
    expect(screen.getByRole("button", { name: /Unfollow @alice/ })).toBeDisabled();
  });

  // ── Following state ──

  it("shows Following button state for already-followed users", async () => {
    const mockFromFollowed = {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({
            data: [{ following_id: "u1" }],
            error: null,
          }),
        }),
      }),
    };
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromFollowed;

    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    // Wait for the follow check to resolve
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unfollow @alice/ })).toBeTruthy();
    });
    const btn = screen.getByRole("button", { name: /Unfollow @alice/ });
    expect(btn.textContent).toContain("Following");
  });

  it("uses 'raised' variant for Following button", async () => {
    const mockFromFollowed = {
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({
            data: [{ following_id: "u1" }],
            error: null,
          }),
        }),
      }),
    };
    const supabaseMock = await import("@/integrations/supabase/client");
    (supabaseMock.supabase as any).from = () => mockFromFollowed;

    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Unfollow @alice/ });
      expect(btn.getAttribute("data-variant")).toBe("raised");
    });
  });

  it("uses 'default' variant for Follow button", async () => {
    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        maxScore={10}
        currentUserId="viewer-1"
      />,
    );
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /Follow @alice/ });
      expect(btn.getAttribute("data-variant")).toBe("default");
    });
  });

  // ── Pagination ──

  it("shows 'Show more' when hasMore is true", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} hasMore />,
    );
    expect(screen.getByText("Show more")).toBeTruthy();
  });

  it("calls onShowMore when 'Show more' is clicked", async () => {
    const onShowMore = vi.fn();
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} hasMore onShowMore={onShowMore} />,
    );
    await userEvent.click(screen.getByText("Show more"));
    expect(onShowMore).toHaveBeenCalled();
  });

  it("disables 'Show more' while loading more", () => {
    render(
      <CompatibleUsersList
        {...defaultProps}
        users={[baseUser]}
        hasMore
        loadingMore
      />,
    );
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(screen.getByText("Loading...")).toBeDisabled();
  });

  // ── Grid layout ──

  it("applies auto-fill grid classes on desktop", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser, { ...baseUser, userId: "u2", username: "bob" }]} maxScore={10} />,
    );
    const gridContainer = document.querySelector(".md\\:grid");
    expect(gridContainer).toBeTruthy();
    const className = gridContainer!.className || "";
    expect(className).toContain("auto-fill");
    expect(className).toContain("minmax");
    expect(className).toContain("300px");
  });

  // ── Edge cases ──

  it("renders single user without errors", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser]} maxScore={10} />,
    );
    expect(screen.getByText("alice")).toBeTruthy();
  });

  it("renders with empty users but not empty state (loading overlay)", () => {
    render(
      <CompatibleUsersList {...defaultProps} users={[]} loading />,
    );
    expect(document.querySelectorAll(".animate-skeleton").length).toBeGreaterThan(0);
  });

  it("handles 2 users correctly (hero + 1 standard)", () => {
    const user2 = { ...baseUser, userId: "u2", username: "bob", displayName: "Bob" };
    render(
      <CompatibleUsersList {...defaultProps} users={[baseUser, user2]} maxScore={10} />,
    );
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
  });
});
