import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useForYouSongs } from "@/hooks/useForYouSongs";

const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockIn = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: (...args: any[]) => {
      mockFrom(...args);
      return { select: mockSelect };
    },
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
        { song_id: "s1", trending_score: 200, heard_count: 20, like_count: 10, dislike_count: 1, review_count: 5 },
      ],
      error: null,
    });

    mockSelect.mockReturnValue({ in: mockIn });
    mockIn.mockResolvedValue({
      data: [{ id: "s1", title: "For You Song", slug: "fy", genius_thumbnail_url: null, genre_tags: null, artist: { name: "Artist F" } }],
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
        { song_id: "s1", trending_score: 50, heard_count: 1, like_count: 0, dislike_count: 0, review_count: 0 },
      ],
      error: null,
    });

    mockSelect.mockReturnValue({ in: mockIn });
    mockIn.mockResolvedValue({
      data: [{ id: "s1", title: "Fallback", slug: "fb", genius_thumbnail_url: null, genre_tags: null, artist: null }],
      error: null,
    });

    const { result } = renderHook(() => useForYouSongs("me"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.songs).toHaveLength(1);
    expect(result.current.songs[0].title).toBe("Fallback");
  });
});
