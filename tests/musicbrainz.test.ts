import { describe, it, expect } from "vitest";
import { parseRecording, type ParsedMusicBrainzResult } from "../src/lib/musicbrainz";

describe("parseRecording", () => {
  it("parses a recording with full metadata", () => {
    const recording = {
      id: "abc-123",
      title: "Bohemian Rhapsody",
      "artist-credit": [
        {
          artist: { id: "queen-id", name: "Queen", "sort-name": "Queen" },
          joinphrase: "",
        },
      ],
      tags: [
        { name: "rock", count: 5 },
        { name: "classic rock", count: 3 },
      ],
      releases: [
        {
          id: "rel-1",
          title: "A Night at the Opera",
          date: "1975-11-21",
          country: "GB",
          "release-group": { id: "rg-1", title: "A Night at the Opera" },
        },
      ],
    };

    const result = parseRecording(recording as never);
    expect(result.mbid).toBe("abc-123");
    expect(result.title).toBe("Bohemian Rhapsody");
    expect(result.artistName).toBe("Queen");
    expect(result.artistMbid).toBe("queen-id");
    expect(result.releaseGroupMbid).toBe("rg-1");
    expect(result.releaseGroupTitle).toBe("A Night at the Opera");
    expect(result.releaseDate).toBe("1975-11-21");
    expect(result.country).toBe("GB");
    expect(result.tags).toEqual(["rock", "classic rock"]);
  });

  it("handles recordings without releases", () => {
    const recording = {
      id: "no-rel",
      title: "Demo Track",
      tags: [],
    };

    const result = parseRecording(recording as never);
    expect(result.releaseGroupMbid).toBeNull();
    expect(result.releaseDate).toBeNull();
    expect(result.country).toBeNull();
  });

  it("concatenates multiple artist credits", () => {
    const recording = {
      id: "feat-1",
      title: "See You Again",
      "artist-credit": [
        {
          artist: { id: "wiz-id", name: "Wiz Khalifa", "sort-name": "Wiz Khalifa" },
          joinphrase: " feat. ",
        },
        {
          artist: { id: "cp-id", name: "Charlie Puth", "sort-name": "Puth, Charlie" },
        },
      ],
      tags: [],
      releases: [],
    };

    const result = parseRecording(recording as never);
    expect(result.artistName).toBe("Wiz Khalifa feat. Charlie Puth");
    expect(result.artistMbid).toBe("wiz-id");
  });

  it("handles recordings with no artist-credit", () => {
    const recording = {
      id: "anon",
      title: "Unknown Track",
      tags: [],
      releases: [],
    };

    const result = parseRecording(recording as never);
    expect(result.artistName).toBe("Unknown");
    expect(result.artistMbid).toBeNull();
  });
});
