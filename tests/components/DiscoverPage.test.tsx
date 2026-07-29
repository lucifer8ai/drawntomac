import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DiscoverPage } from "@/components/feed/DiscoverPage";

let mockUserId: string | null = "user-1";

const mockRpc = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={params ? `/${to.split("/$")[0]}/${params.slug ?? params.username ?? ""}` : "/"} className={className}>{children}</a>
  ),
}));

vi.mock("@/routes/_authenticated/route", () => ({
  TabContext: {
    Provider: ({ children }: any) => children,
  },
  useTabContext: () => ({
    triggerSearch: () => {},
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (table: string) => {
      if (table === "diary_entries") {
        return {
          select: () => ({
            in: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "follows") {
        return {
          select: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }) };
    },
    auth: { getUser: () => Promise.resolve({ data: mockUserId ? { user: { id: mockUserId } } : { user: null }, error: null }) },
  },
}));

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = "user-1";
    mockRpc.mockImplementation((fn) => {
      if (fn === "get_trending_songs") {
        return Promise.resolve({
          data: [
            { song_id: "s1", title: "Trending Song", slug: "trending-song", artist_name: "Artist T", album_art_url: null, genre_tags: ["pop", "rock"], like_count: 3, heard_count: 5, dislike_count: 0, review_count: 1, trending_score: 100 },
          ],
          error: null,
        });
      }
      if (fn === "get_compatible_users") {
        return Promise.resolve({
          data: [
            {
              user_id: "u1", username: "alice", display_name: "Alice", avatar_url: null,
              shared_songs: 3, shared_heard: 2, shared_liked: 1, shared_disliked: 0, shared_want: 0, shared_reviewed: 0,
              liked_songs: ["S1"], want_songs: [],
              last_active_at: "2026-07-10T00:00:00Z", top_shared_artist: null, current_user_total: 10,
            },
          ],
          error: null,
        });
      }
      if (fn === "get_connecting_songs") {
        return Promise.resolve({ data: [], error: null });
      }
      if (fn === "get_top_movers") {
        return Promise.resolve({ data: [], error: null });
      }
      if (fn === "get_trending_social_proof") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it("renders People section when authenticated", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      const matches = screen.getAllByText("People");
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders What's Hot section", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("What's Hot")).toBeTruthy();
    });
  });

  it("hides People when anonymous", async () => {
    mockUserId = null;
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("What's Hot")).toBeTruthy();
    });
    expect(screen.queryByText("People")).toBeFalsy();
  });

  it("renders anon CTA when anonymous", async () => {
    mockUserId = null;
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("Find your people.")).toBeTruthy();
    });
    expect(screen.getByText("Sign Up")).toBeTruthy();
  });

  it("renders sort toggle buttons when authenticated", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("Best Match")).toBeTruthy();
    });
    expect(screen.getByText("Most Shared")).toBeTruthy();
    expect(screen.getByText("Recent")).toBeTruthy();
  });

  it("renders time window toggle", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("Week")).toBeTruthy();
    });
    expect(screen.getByText("Month")).toBeTruthy();
    expect(screen.getByText("All Time")).toBeTruthy();
  });

  it("renders trending song content", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getAllByText("Trending Song").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders compatible user when authenticated", async () => {
    render(<DiscoverPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
    });
  });
});
