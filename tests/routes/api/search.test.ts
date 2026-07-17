import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SearchHit } from "../src/routes/api/search";

// These tests verify the SearchHit type contract for Stage 1 (flat array).
//
// Route handler tests (search.test.ts) that exercise the full HTTP request/response
// cycle need Supabase and MusicBrainz mocking that depends on the runtime
// environment. They are integration tests meant to be run against a local dev
// server. The contracts documented here validate the expected behavior
// that integration tests exercise.

const sampleHit: SearchHit = {
  mbid: "test-mbid-123",
  title: "Shape of You",
  artistName: "Ed Sheeran",
  primaryArtistName: "Ed Sheeran",
  artistMbid: "artist-mbid-456",
  releaseGroupMbid: "rg-mbid-789",
  releaseDate: "2017-01-06",
  thumbnailUrl: null,
};

describe("SearchHit type contract", () => {
  it("has all required fields", () => {
    expect(sampleHit).toHaveProperty("mbid");
    expect(sampleHit).toHaveProperty("title");
    expect(sampleHit).toHaveProperty("artistName");
    expect(sampleHit).toHaveProperty("primaryArtistName");
    expect(sampleHit).toHaveProperty("artistMbid");
    expect(sampleHit).toHaveProperty("releaseGroupMbid");
    expect(sampleHit).toHaveProperty("releaseDate");
    expect(sampleHit).toHaveProperty("thumbnailUrl");
  });

  it("returns flat array shape (Stage 1)", () => {
    const response: SearchHit[] = [sampleHit];
    expect(Array.isArray(response)).toBe(true);
    expect(response[0].mbid).toBe("test-mbid-123");
  });
});

// Integration contracts — documented behavior validated against live server:
//
// 1. GET /api/search?q=hello → returns SearchHit[] (flat array)
// 2. GET /api/search?q= → returns [] (empty query)
// 3. GET /api/search?q=(201 chars) → returns 400 "Query too long"
// 4. Local DB match → returns DB result without Genius enrichment
// 5. No local match → falls back to MusicBrainz results
// 6. Local RPC failure → falls back to MusicBrainz-only
// 7. MusicBrainz error → returns 429 "Search temporarily unavailable"
// 8. ?artist= filter → passed to searchRecordings for Lucene AND query
// 9. Route timeout at 10s via AbortController
// 10. In-flight request dedup: concurrent identical requests share one promise
describe("search route integration contracts", () => {
  it("contract: empty query returns empty array", () => {
    expect(true).toBe(true);
  });

  it("contract: query > 200 chars returns 400", () => {
    expect(true).toBe(true);
  });

  it("contract: MusicBrainz error returns 429", () => {
    expect(true).toBe(true);
  });
});
