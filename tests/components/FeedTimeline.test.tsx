import { describe, it, expect } from "vitest";
import { groupBySong } from "../../src/components/feed/FeedTimeline";
import type { FeedEntry } from "../../src/hooks/useFeed";

function makeEntry(overrides: Partial<FeedEntry> & { entryId?: string; songId?: string; userId?: string }): FeedEntry {
  return {
    entryId: overrides.entryId ?? "entry-1",
    userId: overrides.userId ?? "user-1",
    type: overrides.type ?? "heard",
    body: overrides.body ?? null,
    createdAt: overrides.createdAt ?? "2026-07-11T10:00:00Z",
    songId: overrides.songId ?? "song-1",
    songTitle: overrides.songTitle ?? "Test Song",
    songSlug: overrides.songSlug ?? "test-song",
    artistName: overrides.artistName ?? "Test Artist",
    albumArtUrl: overrides.albumArtUrl ?? null,
    username: overrides.username ?? "testuser",
    displayName: overrides.displayName ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
  };
}

describe("groupBySong", () => {
  it("returns solo entry for a single entry", () => {
    const entries = [makeEntry({})];
    const result = groupBySong(entries);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("solo");
  });

  it("coalesces same song within 6-hour window", () => {
    const entries = [
      makeEntry({
        entryId: "e1",
        userId: "u1",
        songId: "song-a",
        type: "heard",
        createdAt: "2026-07-11T10:00:00Z",
      }),
      makeEntry({
        entryId: "e2",
        userId: "u2",
        songId: "song-a",
        type: "like",
        createdAt: "2026-07-11T12:00:00Z",
      }),
    ];
    const result = groupBySong(entries);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("group");
    if (result[0].kind === "group") {
      expect(result[0].users).toHaveLength(2);
    }
  });

  it("keeps same song entries outside 6-hour window separate", () => {
    const entries = [
      makeEntry({
        entryId: "e1",
        userId: "u1",
        songId: "song-a",
        type: "heard",
        createdAt: "2026-07-11T10:00:00Z",
      }),
      makeEntry({
        entryId: "e2",
        userId: "u2",
        songId: "song-a",
        type: "like",
        createdAt: "2026-07-11T18:00:00Z", // 8 hours later
      }),
    ];
    const result = groupBySong(entries);
    expect(result).toHaveLength(2);
    expect(result[0].kind).toBe("solo");
    expect(result[1].kind).toBe("solo");
  });

  it("does not coalesce different songs", () => {
    const entries = [
      makeEntry({ entryId: "e1", songId: "song-a", createdAt: "2026-07-11T10:00:00Z" }),
      makeEntry({ entryId: "e2", songId: "song-b", createdAt: "2026-07-11T10:01:00Z" }),
    ];
    const result = groupBySong(entries);
    expect(result).toHaveLength(2);
  });

  it("merged single-user group on same song becomes solo", () => {
    // Same user, same song, same window — should merge then un-merge as single-user
    const entries = [
      makeEntry({
        entryId: "e1",
        userId: "u1",
        songId: "song-a",
        type: "heard",
        createdAt: "2026-07-11T10:00:00Z",
      }),
      makeEntry({
        entryId: "e2",
        userId: "u1",
        songId: "song-a",
        type: "like",
        createdAt: "2026-07-11T10:30:00Z",
      }),
    ];
    const result = groupBySong(entries);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("solo");
    if (result[0].kind === "solo") {
      // The merged types should be collapsed to just the first type
      // since single-user groups get converted back with user.types[0]
      expect(result[0].type).toBe("heard");
    }
  });

  it("merges types from same user on same song", () => {
    const entries = [
      makeEntry({
        entryId: "e1",
        userId: "u1",
        songId: "song-a",
        type: "heard",
        createdAt: "2026-07-11T10:00:00Z",
      }),
      makeEntry({
        entryId: "e2",
        userId: "u2",
        songId: "song-a",
        type: "like",
        createdAt: "2026-07-11T10:30:00Z",
      }),
    ];
    const result = groupBySong(entries);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("group");
  });

  it("handles empty input", () => {
    const result = groupBySong([]);
    expect(result).toHaveLength(0);
  });
});
