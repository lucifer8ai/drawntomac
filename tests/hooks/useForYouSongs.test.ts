import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useForYouSongs } from "@/hooks/useForYouSongs";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe("useForYouSongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when anonymous", async () => {
    const { result } = renderHook(() => useForYouSongs(null));
    expect(result.current.loading).toBe(false);
    expect(result.current.songs).toEqual([]);
  });

  it("loads for-you songs with data", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        { song_id: "s1", title: "For You Song", slug: "fy", artist_name: "Artist F", album_art_url: null, genre_tags: null, like_count: 10, heard_count: 20, dislike_count: 1, review_count: 5, trending_score: 200 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useForYouSongs("me"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.songs).toHaveLength(1);
    expect(result.current.songs[0].title).toBe("For You Song");
  });

  it("handles error", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const { result } = renderHook(() => useForYouSongs("me"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("fail");
  });

  it("falls back to trending when no for-you results", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    mockRpc.mockResolvedValueOnce({
      data: [
        { song_id: "s1", title: "Fallback", slug: "fb", artist_name: null, album_art_url: null, genre_tags: null, like_count: 0, heard_count: 1, dislike_count: 0, review_count: 0, trending_score: 50 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useForYouSongs("me"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.songs).toHaveLength(1);
    expect(result.current.songs[0].title).toBe("Fallback");
  });
});
