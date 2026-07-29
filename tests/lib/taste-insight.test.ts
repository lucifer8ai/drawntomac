import { describe, it, expect } from "vitest";
import { deriveTasteInsight } from "@/lib/taste-insight";

describe("deriveTasteInsight", () => {
  it("returns null when all stats are zero", () => {
    expect(
      deriveTasteInsight({ heard: 0, liked: 0, disliked: 0, want: 0 }),
    ).toBeNull();
  });

  it("returns discovery insight when liked > disliked and want > heard", () => {
    const result = deriveTasteInsight({
      heard: 10,
      liked: 20,
      disliked: 5,
      want: 15,
    });
    expect(result).toContain("discovery");
  });

  it("returns history insight when liked > disliked and heard > want", () => {
    const result = deriveTasteInsight({
      heard: 30,
      liked: 20,
      disliked: 5,
      want: 10,
    });
    expect(result).toContain("history");
  });

  it("returns completist insight when heard dominates all", () => {
    // Must NOT trigger liked>disliked (so liked must be <= disliked)
    const result = deriveTasteInsight({
      heard: 50,
      liked: 10,
      disliked: 15,
      want: 8,
    });
    expect(result).toContain("completist");
  });

  it("returns wishlist insight when want dominates", () => {
    // Must NOT trigger liked>disliked+want>heard, so liked must be <= disliked
    const result = deriveTasteInsight({
      heard: 5,
      liked: 15,
      disliked: 15,
      want: 40,
    });
    expect(result).toContain("wishlist");
  });

  it("returns journey insight when only heard has data", () => {
    const result = deriveTasteInsight({
      heard: 42,
      liked: 0,
      disliked: 0,
      want: 0,
    });
    expect(result).toContain("journey");
  });

  it("returns strong opinions insight when disliked dominates", () => {
    const result = deriveTasteInsight({
      heard: 20,
      liked: 5,
      disliked: 25,
      want: 3,
    });
    expect(result).toContain("opinions");
  });

  it("returns measured fallback when all stats equal and non-zero", () => {
    const result = deriveTasteInsight({
      heard: 10,
      liked: 10,
      disliked: 10,
      want: 10,
    });
    expect(result).toContain("Measured and intentional");
  });

  it("returns measured fallback when no specific condition matches", () => {
    // heard=10, liked=20, disliked=15, want=10
    // - heard-only: no (liked>0)
    // - strong-opinions: disliked(15)>liked(20)? no
    // - discovery: liked(20)>disliked(15)? yes, want(10)>heard(10)? no (not >)
    // - history: liked(20)>disliked(15)? yes, heard(10)>want(10)? no (not >)
    // - completist: heard(10)>liked(20)? no
    // - wishlist: want(10)>heard(10)? no
    // Only the default fallback remains.
    const result = deriveTasteInsight({
      heard: 10,
      liked: 20,
      disliked: 15,
      want: 10,
    });
    expect(result).toContain("Measured and intentional");
  });
});
