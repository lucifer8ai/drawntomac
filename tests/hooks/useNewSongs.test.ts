import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useNewSongs } from "@/hooks/useNewSongs";

const mockRpc = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

describe("useNewSongs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockRpc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useNewSongs());
    expect(result.current.loading).toBe(true);
  });

  it("loads new songs with data", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { song_id: "s1", title: "New Song 1", slug: "ns1", artist_name: "Artist N", genius_thumbnail_url: null },
        { song_id: "s2", title: "New Song 2", slug: "ns2", artist_name: null, genius_thumbnail_url: "http://img.com/2.jpg" },
      ],
      error: null,
    });

    const { result } = renderHook(() => useNewSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.songs).toHaveLength(2);
    expect(result.current.songs[0]).toMatchObject({ title: "New Song 1", artistName: "Artist N" });
    expect(result.current.songs[1]).toMatchObject({ title: "New Song 2", artistName: null, albumArtUrl: "http://img.com/2.jpg" });
    expect(result.current.isEmpty).toBe(false);
  });

  it("handles error and retry", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

    const { result } = renderHook(() => useNewSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("fail");

    mockRpc.mockResolvedValueOnce({
      data: [{ song_id: "s1", title: "Recovered", slug: "rec", artist_name: "A", genius_thumbnail_url: null }],
      error: null,
    });

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.songs).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("sets empty state when no results", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useNewSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isEmpty).toBe(true);
  });
});
