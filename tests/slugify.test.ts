import { describe, it, expect } from "vitest";
import { generateSlug, slugifyBase } from "../src/lib/slugify";

describe("slugifyBase", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugifyBase("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugifyBase("Café! Del Mar (Remix)")).toBe("caf-del-mar-remix");
  });

  it("collapses multiple hyphens", () => {
    expect(slugifyBase("a---b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyBase("-hello-")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugifyBase("")).toBe("");
  });
});

describe("generateSlug", () => {
  it("produces a slug with title prefix and uuid segment", () => {
    const slug = generateSlug("Bohemian Rhapsody");
    expect(slug).toMatch(/^bohemian-rhapsody-[a-f0-9]{8}$/);
  });

  it("produces unique slugs across calls", () => {
    const slugs = new Set(Array.from({ length: 100 }, () => generateSlug("Test Song")));
    expect(slugs.size).toBe(100);
  });
});
