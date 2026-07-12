import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PublicProfile } from "@/components/profile/PublicProfile";

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={params ? `/${to.replace("$", "")}${params.username ?? params.slug ?? ""}` : "/"} className={className}>{children}</a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/hooks/useCompatibility", () => ({
  useCompatibility: () => ({ data: null, loading: false }),
  getCompatibilityTier: () => null,
}));

vi.mock("@/hooks/useProfileStats", () => ({
  useProfileStats: () => ({ stats: { heard: 0, liked: 0, disliked: 0, want: 0 }, loading: false }),
}));

vi.mock("@/components/profile/FollowListSheet", () => ({
  FollowListSheet: () => null,
}));

const mockProfile = {
  id: "profile-1",
  username: "alice",
  display_name: "Alice",
  display_name_visible: true,
  bio: "Music lover.",
  avatar_url: null,
  banner_url: null,
  pronouns: "she/they",
  country: "US",
  city: "Brooklyn",
};

function setupSupabaseResponse(overrides: Record<string, any> = {}) {
  const base = { ...mockProfile, ...overrides };

  const chain: Record<string, any> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
  };

  chain.single = vi.fn(() => Promise.resolve({ data: base, error: null }));
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "follows") {
      // Return a mock that chains infinitely and resolves with empty data
      const followsMock: any = {
        select: vi.fn(() => followsMock),
        eq: vi.fn(() => followsMock),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
      return followsMock;
    }
    return chain;
  });
}

describe("PublicProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton initially", async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => new Promise(() => {})),
      maybeSingle: vi.fn(() => new Promise(() => {})),
    } as any);

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders user not found state", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: { message: "not found" } })),
    } as any;

    mockSupabase.from.mockReturnValue(chain);

    render(<PublicProfile username="nonexistent" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText(/doesn't exist/)).toBeTruthy();
    });
  });

  it("renders profile with display name", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    expect(screen.getByText("@alice")).toBeTruthy();
  });

  it("renders pronouns when present", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("she/they")).toBeTruthy();
    });
  });

  it("renders bio when present", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Music lover.")).toBeTruthy();
    });
  });

  it("renders location when present", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Brooklyn, US")).toBeTruthy();
    });
  });

  it("shows follow button for other users", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Follow @alice/ })).toBeTruthy();
    });
  });

  it("hides follow button for own profile", async () => {
    const ownProfile = { ...mockProfile, id: "viewer-1" };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: ownProfile, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    } as any);

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
    expect(screen.queryByRole("button", { name: /Follow @alice/ })).toBeFalsy();
  });

  it("shows #d.taste section header", async () => {
    setupSupabaseResponse();

    render(<PublicProfile username="alice" viewerId="viewer-1" />);

    await waitFor(() => {
      expect(screen.getByText("#d.taste")).toBeTruthy();
    });
  });
});
