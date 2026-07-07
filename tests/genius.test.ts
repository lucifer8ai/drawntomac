import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGeniusArtwork } from "../src/lib/genius";

const OLD_ENV = process.env;

describe("searchGeniusArtwork", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
  });

  it("returns null when no token is set", async () => {
    delete process.env.GENIUS_ACCESS_TOKEN;
    const { searchGeniusArtwork } = await import("../src/lib/genius");
    const result = await searchGeniusArtwork("Queen", "Bohemian Rhapsody");
    expect(result.thumbnailUrl).toBeNull();
    expect(result.geniusSongId).toBeNull();
  });

  it("returns artwork from Genius search response", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            response: {
              hits: [
                {
                  result: {
                    id: 12345,
                    song_art_image_thumbnail_url: "https://example.com/thumb.jpg",
                    primary_artist: { id: 99 },
                  },
                },
              ],
            },
          }),
      }),
    );

    const { searchGeniusArtwork } = await import("../src/lib/genius");
    const result = await searchGeniusArtwork("Queen", "Bohemian Rhapsody");
    expect(result.thumbnailUrl).toBe("https://example.com/thumb.jpg");
    expect(result.geniusSongId).toBe("12345");
    expect(result.geniusArtistId).toBe("99");
  });

  it("returns null when Genius API errors", async () => {
    process.env.GENIUS_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    const { searchGeniusArtwork } = await import("../src/lib/genius");
    const result = await searchGeniusArtwork("Queen", "Song");
    expect(result.thumbnailUrl).toBeNull();
  });
});
