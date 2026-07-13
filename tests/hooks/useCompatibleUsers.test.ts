import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCompatibleUsers } from "@/hooks/useCompatibleUsers";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe("useCompatibleUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("short-circuits when anonymous (null userId)", async () => {
    const { result } = renderHook(() => useCompatibleUsers(null, "composite", 0));
    expect(result.current.loading).toBe(false);
    expect(result.current.users).toEqual([]);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.diaryCount).toBe(0);
  });

  it("loads compatible users with data", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          user_id: "u1",
          username: "alice",
          display_name: "Alice",
          avatar_url: "http://av.com/a.jpg",
          shared_songs: 5,
          shared_heard: 3,
          shared_liked: 2,
          shared_disliked: 0,
          shared_want: 1,
          shared_reviewed: 1,
          liked_songs: ["Song A", "Song B"],
          want_songs: ["Song C"],
          last_active_at: "2026-07-10T00:00:00Z",
          top_shared_artist: "Kendrick Lamar",
          current_user_total: 15,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useCompatibleUsers("me", "composite", 0));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.users).toHaveLength(1);
    expect(result.current.users[0]).toMatchObject({
      userId: "u1",
      username: "alice",
      displayName: "Alice",
      avatarUrl: "http://av.com/a.jpg",
      sharedSongs: 5,
      likedSongs: ["Song A", "Song B"],
      wantSongs: ["Song C"],
      lastActiveAt: "2026-07-10T00:00:00Z",
      topSharedArtist: "Kendrick Lamar",
    });
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.diaryCount).toBe(15);
    expect(result.current.hasMore).toBe(false);
  });

  it("handles error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC failed" } });

    const { result } = renderHook(() => useCompatibleUsers("me", "count", 0));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("RPC failed");
  });

  it("sets empty state when no results", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useCompatibleUsers("me", "recent", 1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
  });

  it("appends on page > 0", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          user_id: "u1", username: "alice", display_name: "Alice", avatar_url: null,
          shared_songs: 5, shared_heard: 3, shared_liked: 2, shared_disliked: 0,
          shared_want: 1, shared_reviewed: 1,
          liked_songs: ["Song A"], want_songs: [],
          last_active_at: null, top_shared_artist: null, current_user_total: 10,
        },
      ],
      error: null,
    });

    const { result, rerender } = renderHook(
      ({ page }) => useCompatibleUsers("me", "composite", page),
      { initialProps: { page: 0 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toHaveLength(1);

    mockRpc.mockResolvedValueOnce({
      data: [
        {
          user_id: "u2", username: "bob", display_name: "Bob", avatar_url: null,
          shared_songs: 3, shared_heard: 2, shared_liked: 1, shared_disliked: 0,
          shared_want: 0, shared_reviewed: 0,
          liked_songs: [], want_songs: [],
          last_active_at: null, top_shared_artist: null, current_user_total: 10,
        },
      ],
      error: null,
    });

    rerender({ page: 1 });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.users).toHaveLength(2);
  });
});
