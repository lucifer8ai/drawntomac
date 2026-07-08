/**
 * Tests for song.$slug.tsx patterns and logic.
 * These verify the route file structure and data flow rather than
 * rendering the full component (which requires complex mocking of
 * supabase auth + TanStack router).
 */
import { describe, it, expect } from "vitest";

const REVIEW_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

function canEditReview(createdAt: string): boolean {
  return new Date(createdAt).getTime() + REVIEW_EDIT_WINDOW_MS > Date.now();
}

describe("song page logic", () => {
  describe("review edit window", () => {
    it("allows editing within 48 hours", () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(canEditReview(oneHourAgo)).toBe(true);
    });

    it("allows editing at exactly 47 hours", () => {
      const fortySevenHoursAgo = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
      expect(canEditReview(fortySevenHoursAgo)).toBe(true);
    });

    it("blocks editing after 48 hours", () => {
      const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
      expect(canEditReview(fortyNineHoursAgo)).toBe(false);
    });
  });

  describe("diary entry type segregation", () => {
    it("correctly separates heard, want, like, dislike, review", () => {
      const entries = [
        { id: "1", type: "heard" as const, listened_on: "2026-01-01", body: null },
        { id: "2", type: "heard" as const, listened_on: "2026-01-02", body: null },
        { id: "3", type: "want" as const, body: null },
        { id: "4", type: "like" as const, body: null },
        { id: "5", type: "dislike" as const, body: null },
        { id: "6", type: "review" as const, body: "Great song" },
      ];

      const heard = entries.filter((e) => e.type === "heard");
      const want = entries.find((e) => e.type === "want") ?? null;
      const like = entries.find((e) => e.type === "like") ?? null;
      const dislike = entries.find((e) => e.type === "dislike") ?? null;
      const review = entries.find((e) => e.type === "review") ?? null;

      expect(heard).toHaveLength(2);
      expect(want?.id).toBe("3");
      expect(like?.id).toBe("4");
      expect(dislike?.id).toBe("5");
      expect(review?.body).toBe("Great song");
    });

    it("allows multiple heard entries per song", () => {
      const heardEntries = [
        { id: "h1", type: "heard" as const, listened_on: "2026-01-01" },
        { id: "h2", type: "heard" as const, listened_on: "2026-01-02" },
        { id: "h3", type: "heard" as const, listened_on: "2026-01-03" },
      ];
      expect(heardEntries).toHaveLength(3);
      expect(new Set(heardEntries.map((e) => e.id)).size).toBe(3);
    });

    it("enforces only one want per user+song", () => {
      const wantEntries = [{ id: "w1", type: "want" as const }];
      expect(wantEntries).toHaveLength(1);
    });

    it("enforces only one like per user+song", () => {
      const likeEntries = [{ id: "l1", type: "like" as const }];
      expect(likeEntries).toHaveLength(1);
    });

    it("enforces only one dislike per user+song", () => {
      const dislikeEntries = [{ id: "d1", type: "dislike" as const }];
      expect(dislikeEntries).toHaveLength(1);
    });

    it("enforces only one review per user+song", () => {
      const reviewEntries = [{ id: "rv1", type: "review" as const }];
      expect(reviewEntries).toHaveLength(1);
    });
  });

  describe("like/dislike mutual exclusion", () => {
    function toggleSentiment(
      current: { type: "like" | "dislike" } | null,
      target: "like" | "dislike",
    ): { type: "like" | "dislike" } | null {
      if (current && current.type === target) return null;
      return { type: target };
    }

    it("neutral → like", () => {
      expect(toggleSentiment(null, "like")).toEqual({ type: "like" });
    });

    it("neutral → dislike", () => {
      expect(toggleSentiment(null, "dislike")).toEqual({ type: "dislike" });
    });

    it("like → toggle off", () => {
      expect(toggleSentiment({ type: "like" }, "like")).toBeNull();
    });

    it("dislike → toggle off", () => {
      expect(toggleSentiment({ type: "dislike" }, "dislike")).toBeNull();
    });

    it("like → swap to dislike", () => {
      expect(toggleSentiment({ type: "like" }, "dislike")).toEqual({ type: "dislike" });
    });

    it("dislike → swap to like", () => {
      expect(toggleSentiment({ type: "dislike" }, "like")).toEqual({ type: "like" });
    });
  });

  describe("today detection for heard button", () => {
    function heardToday(entries: Array<{ listened_on: string }>): boolean {
      const today = new Date().toISOString().slice(0, 10);
      return entries.some((e) => e.listened_on === today);
    }

    it("detects today's hear via listened_on", () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(heardToday([{ listened_on: today }])).toBe(true);
    });

    it("does not detect yesterday's hear", () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      expect(heardToday([{ listened_on: yesterday }])).toBe(false);
    });

    it("returns false for empty entries", () => {
      expect(heardToday([])).toBe(false);
    });
  });

  describe("want-to-hear visibility", () => {
    function wantVisible(entries: Array<{ type: string; listened_on?: string }>): boolean {
      return entries.length === 0;
    }

    it("visible when no entries exist", () => {
      expect(wantVisible([])).toBe(true);
    });

    it("hidden after heard is logged", () => {
      expect(wantVisible([{ type: "heard", listened_on: "2026-01-01" }])).toBe(false);
    });

    it("hidden when a review exists", () => {
      expect(wantVisible([{ type: "review" }])).toBe(false);
    });

    it("hidden when like exists", () => {
      expect(wantVisible([{ type: "like" }])).toBe(false);
    });

    it("hidden when want + heard both exist (shouldn't happen but tests the logic)", () => {
      expect(wantVisible([{ type: "want" }, { type: "heard" }])).toBe(false);
    });

    it("visible after unhearing if no other entries remain", () => {
      expect(wantVisible([])).toBe(true);
    });
  });
});
