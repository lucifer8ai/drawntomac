import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTrendingSongs } from "@/hooks/useTrendingSongs";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe("useTrendingSongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockRpc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTrendingSongs());
    expect(result.current.loading).toBe(true);
    expect(result.current.songs).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("loads trending songs with data", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { song_id: "s1", title: "Song One", slug: "song-one", artist_name: "Artist A", album_art_url: "http://img.com/1.jpg", genre_tags: ["rock"], like_count: 5, heard_count: 10, dislike_count: 1, review_count: 3, trending_score: 100 },
        { song_id: "s2", title: "Song Two", slug: "song-two", artist_name: null, album_art_url: null, genre_tags: null, like_count: 4, heard_count: 8, dislike_count: 0, review_count: 1, trending_score: 80 },
      ],
      error: null,
    });

    const { result } = renderHook(() => useTrendingSongs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.songs).toHaveLength(2);
    expect(result.current.songs[0]).toMatchObject({
      id: "s1",
      title: "Song One",
      slug: "song-one",
      artistName: "Artist A",
      albumArtUrl: "http://img.com/1.jpg",
      likeCount: 5,
      heardCount: 10,
      reviewCount: 3,
    });
    expect(result.current.isEmpty).toBe(false);
  });

  it("handles error and retry", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useTrendingSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
    expect(result.current.songs).toEqual([]);

    mockRpc.mockResolvedValueOnce({
      data: [
        { song_id: "s1", title: "Fixed", slug: "fixed", artist_name: "X", album_art_url: null, genre_tags: null, like_count: 0, heard_count: 1, dislike_count: 0, review_count: 0, trending_score: 10 },
      ],
      error: null,
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.songs).toHaveLength(1);
  });

  it("has empty state when no songs", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useTrendingSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.songs).toEqual([]);
  });
});
