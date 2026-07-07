import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCoverArt } from "../src/lib/coverartarchive";

describe("getCoverArt", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the front image large thumbnail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            images: [
              {
                id: "1",
                image: "https://example.com/full.jpg",
                thumbnails: { large: "https://example.com/large.jpg", small: "https://example.com/small.jpg" },
                front: true,
                back: false,
                approved: true,
              },
            ],
            release: "https://musicbrainz.org/release/abc",
          }),
      }),
    );

    const result = await getCoverArt("release-1");
    expect(result).toBe("https://example.com/large.jpg");
  });

  it("returns null when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await getCoverArt("release-1");
    expect(result).toBeNull();
  });

  it("returns null on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await getCoverArt("release-1");
    expect(result).toBeNull();
  });

  it("falls back to small thumbnail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            images: [
              {
                id: "1",
                image: "https://example.com/full.jpg",
                thumbnails: { small: "https://example.com/small.jpg" },
                front: true,
                back: false,
                approved: true,
              },
            ],
            release: "https://musicbrainz.org/release/abc",
          }),
      }),
    );

    const result = await getCoverArt("release-1");
    expect(result).toBe("https://example.com/small.jpg");
  });
});
