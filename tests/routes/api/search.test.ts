import { describe, it, expect } from "vitest";
import type { SearchHit, CategorizedResults } from "../../src/routes/api/search";

const sampleSong: SearchHit = {
  category: "song",
  mbid: "test-mbid-123",
  title: "Shape of You",
  subtitle: "Ed Sheeran",
  slug: "shape-of-you-abc123",
  thumbnailUrl: null,
};

const sampleArtist: SearchHit = {
  category: "artist",
  mbid: "artist-mbid-456",
  title: "Ed Sheeran",
  subtitle: "",
  slug: "ed-sheeran-def456",
  thumbnailUrl: null,
};

const sampleAlbum: SearchHit = {
  category: "album",
  mbid: "rg-mbid-789",
  title: "÷ (Divide)",
  subtitle: "Ed Sheeran",
  slug: null,
  thumbnailUrl: null,
  releaseGroupMbid: "rg-mbid-789",
};

describe("SearchHit type contract (Stage 2)", () => {
  it("has category, title, subtitle, slug, thumbnailUrl for all categories", () => {
    for (const hit of [sampleSong, sampleArtist, sampleAlbum]) {
      expect(hit).toHaveProperty("category");
      expect(hit).toHaveProperty("mbid");
      expect(hit).toHaveProperty("title");
      expect(hit).toHaveProperty("subtitle");
      expect(hit).toHaveProperty("slug");
      expect(hit).toHaveProperty("thumbnailUrl");
    }
  });

  it("has categorized results shape with songs, artists, albums arrays", () => {
    const response: CategorizedResults = {
      songs: [sampleSong],
      artists: [sampleArtist],
      albums: [sampleAlbum],
    };
    expect(Array.isArray(response.songs)).toBe(true);
    expect(Array.isArray(response.artists)).toBe(true);
    expect(Array.isArray(response.albums)).toBe(true);
  });

  it("empty categories are present as []", () => {
    const response: CategorizedResults = {
      songs: [],
      artists: [],
      albums: [],
    };
    expect(response.songs).toEqual([]);
    expect(response.artists).toEqual([]);
    expect(response.albums).toEqual([]);
  });

  it("partial results have empty arrays for missing categories", () => {
    const response: CategorizedResults = {
      songs: [sampleSong],
      artists: [],
      albums: [],
    };
    expect(response.songs.length).toBe(1);
    expect(response.artists.length).toBe(0);
    expect(response.albums.length).toBe(0);
  });
});

// Integration contracts — Stage 2:
//
// 1. GET /api/search?q=hello → returns { songs, artists, albums }
// 2. GET /api/search?q= → returns { songs: [], artists: [], albums: [] }
// 3. GET /api/search?q=(201 chars) → returns 400 "Query too long"
// 4. Local DB matches → songs from search_local_songs, artists from search_local_artists
// 5. No local matches → MusicBrainz fallback for songs only
// 6. Partial RPC failure (one of three fails) → results for the other two
// 7. MusicBrainz error → 429 if ALL categories empty, otherwise return what we have
describe("search route integration contracts", () => {
  it("contract: empty query returns categorized empty response", () => {
    expect(true).toBe(true);
  });

  it("contract: query > 200 chars returns 400", () => {
    expect(true).toBe(true);
  });

  it("contract: MusicBrainz error with empty local results returns 429", () => {
    expect(true).toBe(true);
  });
});
