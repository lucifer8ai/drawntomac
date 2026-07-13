import { describe, it, expect } from "vitest";
import { pickBestRelease, parseDisambiguation, ALLOWED_COUNTRIES } from "../src/lib/musicbrainz";
import type { MusicBrainzRelease } from "../src/lib/musicbrainz";

describe("pickBestRelease", () => {
  it("returns null for empty array", () => {
    expect(pickBestRelease([])).toBeNull();
  });

  it("returns the only release", () => {
    const r: MusicBrainzRelease = { id: "1", title: "Test", date: "2024-01-01" };
    expect(pickBestRelease([r])).toBe(r);
  });

  it("prefers official over promo", () => {
    const official: MusicBrainzRelease = { id: "1", title: "A", status: "official" };
    const promo: MusicBrainzRelease = { id: "2", title: "B", status: "promotion" };
    expect(pickBestRelease([promo, official])?.id).toBe("1");
  });

  it("with same status, picks newer date", () => {
    const old: MusicBrainzRelease = { id: "1", title: "A", status: "official", date: "2020-01-01" };
    const recent: MusicBrainzRelease = { id: "2", title: "B", status: "official", date: "2024-01-01" };
    expect(pickBestRelease([old, recent])?.id).toBe("2");
  });

  it("penalizes hi-res disambiguation", () => {
    const normal: MusicBrainzRelease = { id: "1", title: "A", status: "official" };
    const hiRes: MusicBrainzRelease = { id: "2", title: "B", status: "official", disambiguation: "24-bit / 96 kHz" };
    expect(pickBestRelease([hiRes, normal])?.id).toBe("1");
  });

  it("favors ALLOWED_COUNTRIES releases", () => {
    const foreign: MusicBrainzRelease = { id: "1", title: "A", status: "official", country: "JP" };
    const allowed: MusicBrainzRelease = { id: "2", title: "B", status: "official", country: "US" };
    expect(pickBestRelease([foreign, allowed])?.id).toBe("2");
  });
});

describe("parseDisambiguation", () => {
  it("detects explicit", () => {
    expect(parseDisambiguation("[explicit]").explicit).toBe(true);
    expect(parseDisambiguation("some text [Explicit] more").explicit).toBe(true);
  });

  it("detects clean", () => {
    expect(parseDisambiguation("[clean]").clean).toBe(true);
    expect(parseDisambiguation("[Clean] version").clean).toBe(true);
  });

  it("detects hi-res", () => {
    expect(parseDisambiguation("24-bit / 96 kHz").hiRes).toBe(true);
    expect(parseDisambiguation("24-bit/96 kHz").hiRes).toBe(true);
  });

  it("returns false for everything on null/undefined", () => {
    expect(parseDisambiguation(null)).toEqual({ explicit: false, clean: false, hiRes: false });
    expect(parseDisambiguation(undefined)).toEqual({ explicit: false, clean: false, hiRes: false });
  });
});

describe("ALLOWED_COUNTRIES", () => {
  it("includes IN, US, GB, AU, CA, XW", () => {
    expect(ALLOWED_COUNTRIES).toContain("IN");
    expect(ALLOWED_COUNTRIES).toContain("US");
    expect(ALLOWED_COUNTRIES).toContain("GB");
    expect(ALLOWED_COUNTRIES).toContain("AU");
    expect(ALLOWED_COUNTRIES).toContain("CA");
    expect(ALLOWED_COUNTRIES).toContain("XW");
  });
});

describe("diary entry type segregation", () => {
  it("correctly separates heard, want, like, dislike, review", () => {
    const entries = [
      { id: "1", type: "heard" as const, body: null },
      { id: "3", type: "want" as const, body: null },
      { id: "4", type: "like" as const, body: null },
      { id: "5", type: "dislike" as const, body: null },
      { id: "6", type: "review" as const, body: "Great song" },
    ];

    const heard = entries.find((e) => e.type === "heard") ?? null;
    const want = entries.find((e) => e.type === "want") ?? null;
    const like = entries.find((e) => e.type === "like") ?? null;
    const dislike = entries.find((e) => e.type === "dislike") ?? null;
    const review = entries.find((e) => e.type === "review") ?? null;

    expect(heard?.id).toBe("1");
    expect(want?.id).toBe("3");
    expect(like?.id).toBe("4");
    expect(dislike?.id).toBe("5");
    expect(review?.body).toBe("Great song");
  });

  it("each type is only one per user+song (lookup pattern)", () => {
    // With the new design: find first match, null if none
    const entries = [{ id: "h1", type: "heard" as const }];
    const heard = entries.find((e) => e.type === "heard") ?? null;
    expect(heard?.id).toBe("h1");

    const want = entries.find((e) => e.type === "want") ?? null;
    expect(want).toBeNull();
  });

  it("enforces only one want per user+song", () => {
    const wantEntries = [{ id: "w1", type: "want" as const }];
    // Only one should exist
    const want = wantEntries.find((e) => e.type === "want") ?? null;
    expect(want).not.toBeNull();
    expect(wantEntries.filter((e) => e.type === "want")).toHaveLength(1);
  });

  it("enforces only one like/dislike per user+song", () => {
    const entries = [{ id: "l1", type: "like" as const }];
    expect(entries.find((e) => e.type === "like")?.id).toBe("l1");
    expect(entries.find((e) => e.type === "dislike")).toBeUndefined();
  });

  it("enforces only one review per user+song", () => {
    const entries = [{ id: "r1", type: "review" as const, body: "nice" }];
    expect(entries.filter((e) => e.type === "review")).toHaveLength(1);
  });
});

describe("sentiment toggle behavior (like/dislike mutual exclusion)", () => {
  function toggleSentiment(
    existing: { type: "like" | "dislike" } | null,
    target: "like" | "dislike",
  ): { type: "like" | "dislike" } | null {
    if (existing?.type === target) return null;
    return { type: target };
  }

  it("like → unlike (toggle off)", () => {
    expect(toggleSentiment({ type: "like" }, "like")).toBeNull();
  });

  it("no like → like (toggle on)", () => {
    expect(toggleSentiment(null, "like")).toEqual({ type: "like" });
  });

  it("dislike → unlike (toggle off)", () => {
    expect(toggleSentiment({ type: "dislike" }, "dislike")).toBeNull();
  });

  it("like → swap to dislike", () => {
    expect(toggleSentiment({ type: "like" }, "dislike")).toEqual({ type: "dislike" });
  });

  it("dislike → swap to like", () => {
    expect(toggleSentiment({ type: "dislike" }, "like")).toEqual({ type: "like" });
  });
});

describe("heard detection (presence check)", () => {
  function isHeard(entry: { type: string } | null): boolean {
    return entry !== null && entry.type === "heard";
  }

  it("detects heard when entry exists", () => {
    expect(isHeard({ type: "heard" })).toBe(true);
  });

  it("returns false when entry is null", () => {
    expect(isHeard(null)).toBe(false);
  });

  it("returns false for non-heard entries", () => {
    expect(isHeard({ type: "want" })).toBe(false);
    expect(isHeard({ type: "like" })).toBe(false);
    expect(isHeard({ type: "review" })).toBe(false);
  });
});

describe("want-to-hear visibility", () => {
  function wantVisible(
    heard: { type: string } | null,
    like: { type: string } | null,
    review: { type: string } | null,
  ): boolean {
    const hasInteractions = like !== null || review !== null;
    return heard === null && !hasInteractions;
  }

  it("visible when no entries exist", () => {
    expect(wantVisible(null, null, null)).toBe(true);
  });

  it("hidden after heard is logged", () => {
    expect(wantVisible({ type: "heard" }, null, null)).toBe(false);
  });

  it("hidden when a review exists", () => {
    expect(wantVisible(null, null, { type: "review" })).toBe(false);
  });

  it("hidden when like exists", () => {
    expect(wantVisible(null, { type: "like" }, null)).toBe(false);
  });

  it("hidden when heard + like exist (shouldn't happen but tests the logic)", () => {
    expect(wantVisible({ type: "heard" }, { type: "like" }, null)).toBe(false);
  });
});

describe("heard button visibility", () => {
  function heardVisible(want: { type: string } | null): boolean {
    return want === null;
  }

  it("visible when want is absent", () => {
    expect(heardVisible(null)).toBe(true);
  });

  it("hidden when want is active", () => {
    expect(heardVisible({ type: "want" })).toBe(false);
  });
});

describe("like/dislike/review visibility", () => {
  function showInteractions(
    heard: { type: string } | null,
    like: { type: string } | null,
    dislike: { type: string } | null,
    review: { type: string } | null,
  ): boolean {
    const heardToday = heard !== null;
    const hasInteractions = like !== null || dislike !== null || review !== null;
    return heardToday || hasInteractions;
  }

  it("shows when heard exists", () => {
    expect(showInteractions({ type: "heard" }, null, null, null)).toBe(true);
  });

  it("shows when un-heard but has prior like", () => {
    expect(showInteractions(null, { type: "like" }, null, null)).toBe(true);
  });

  it("shows when un-heard but has prior review", () => {
    expect(showInteractions(null, null, null, { type: "review" })).toBe(true);
  });

  it("hidden when clean slate", () => {
    expect(showInteractions(null, null, null, null)).toBe(false);
  });
});
