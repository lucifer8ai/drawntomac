import { describe, it, expect, vi, beforeEach } from "vitest";
import type { searchGeniusArtwork as SearchFn } from "../src/lib/genius";

const OLD_ENV = process.env;

function mockFetch(responseFactory: () => unknown) {
  return vi.fn().mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve(responseFactory()) }));
}

function emptyHits() {
  return { response: { hits: [] } };
}

describe("searchGeniusArtwork", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    process.env = { ...OLD_ENV };
  });

  it("returns null when no token is set", async () => {
    delete process.env.GENIUS_ACCESS_TOKEN;
    const mod = await import("../src/lib/genius");
    const result = await mod.searchGeniusArtwork("Queen", "Bohemian Rhapsody");
    expect(result.thumbnailUrl).toBeNull();
    expect(result.geniusSongId).toBeNull();
    expect(result.artistImageUrl).toBeNull();
  });

  it("returns artwork from Genius search response", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      mockFetch(() => ({
        response: {
          hits: [
            {
              result: {
                id: 12345,
                song_art_image_thumbnail_url: "https://example.com/thumb.jpg",
                primary_artist: { id: 99, image_url: "https://example.com/artist.jpg" },
              },
            },
          ],
        },
      })),
    );

    const mod = await import("../src/lib/genius");
    const result = await mod.searchGeniusArtwork("Queen", "Bohemian Rhapsody");
    expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result.geniusSongId).toBe("12345");
    expect(result.geniusArtistId).toBe("99");
    expect(result.artistImageUrl).toBe("https://example.com/artist.jpg");
  });

  it("falls back to stripped artist name for collaborations", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(emptyHits()) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              hits: [
                {
                  result: {
                    id: 42,
                    song_art_image_thumbnail_url: "https://example.com/collab.jpg",
                    primary_artist: { id: 7 },
                  },
                },
              ],
            },
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../src/lib/genius");
    const result = await mod.searchGeniusArtwork("Seedhe Maut & Hurricane", "KTMN");
    expect(result.thumbnailUrl).toBe("https://example.com/collab.jpg");
    expect(result.geniusSongId).toBe("42");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to song-title-only when no artist match", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(emptyHits()) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(emptyHits()) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              hits: [
                {
                  result: {
                    id: 99,
                    header_image_thumbnail_url: "https://example.com/title_only.jpg",
                    primary_artist: { id: 1 },
                  },
                },
              ],
            },
          }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../src/lib/genius");
    const result = await mod.searchGeniusArtwork("Artist A feat. Artist B", "Unique Song");
    expect(result.thumbnailUrl).toBe("https://example.com/title_only.jpg");
    expect(result.geniusSongId).toBe("99");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("returns null when Genius API errors", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const mod = await import("../src/lib/genius");
    const result = await mod.searchGeniusArtwork("Queen", "Song");
    expect(result.thumbnailUrl).toBeNull();
  });
});
