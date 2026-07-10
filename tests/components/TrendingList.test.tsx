import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendingList } from "@/components/feed/TrendingList";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={`/song/${params.slug}`} className={className}>{children}</a>
  ),
}));

describe("TrendingList", () => {
  const baseSong = {
    id: "1",
    title: "Test Song",
    slug: "test-song",
    artistName: "Test Artist",
    albumArtUrl: "http://img.com/test.jpg",
    genreTags: ["rock"],
    likeCount: 5,
    heardCount: 10,
    reviewCount: 3,
    dislikeCount: 1,
    trendingScore: 100,
  };

  it("renders loading skeletons", () => {
    render(
      <TrendingList songs={[]} loading error={null} retry={() => {}} isEmpty={false} />
    );
    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error with retry button", () => {
    const retry = vi.fn();
    render(
      <TrendingList songs={[]} loading={false} error="Something went wrong" retry={retry} isEmpty={false} />
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    screen.getByText("Try Again").click();
    expect(retry).toHaveBeenCalled();
  });

  it("renders empty state", () => {
    render(
      <TrendingList songs={[]} loading={false} error={null} retry={() => {}} isEmpty emptyMessage="Nothing here!" />
    );
    expect(screen.getByText("Nothing here!")).toBeTruthy();
  });

  it("renders mobile cards with data", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} showStats />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeTruthy();
    expect(mobileContainer!.textContent).toContain("Test Song");
    expect(mobileContainer!.textContent).toContain("Test Artist");
    expect(mobileContainer!.textContent).toContain("5");
    expect(mobileContainer!.textContent).toContain("10");
  });

  it("renders null album art fallback", () => {
    const song = { ...baseSong, albumArtUrl: null };
    render(
      <TrendingList songs={[song]} loading={false} error={null} retry={() => {}} isEmpty={false} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer!.querySelector("img")).toBeFalsy();
  });

  it("omits null artist", () => {
    const song = { ...baseSong, artistName: null };
    render(
      <TrendingList songs={[song]} loading={false} error={null} retry={() => {}} isEmpty={false} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer!.textContent).not.toContain("Test Artist");
  });

  it("renders desktop table layout", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} showStats />
    );
    const tableContainer = document.querySelector(".hidden.md\\:block");
    expect(tableContainer).toBeTruthy();
    expect(tableContainer!.textContent).toContain("Song");
    expect(tableContainer!.textContent).toContain("Likes");
    expect(tableContainer!.textContent).toContain("Heard");
  });

  it("renders mobile cards with links", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} />
    );
    const link = document.querySelector(".md\\:hidden a[href='/song/test-song']");
    expect(link).toBeTruthy();
  });

  it("hides stats when showStats is false", () => {
    const newSong = { id: "1", title: "New Song", slug: "new", artistName: "Artist", albumArtUrl: null };
    render(
      <TrendingList songs={[newSong]} loading={false} error={null} retry={() => {}} isEmpty={false} showStats={false} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer!.textContent).not.toContain("Likes");
  });

  it("shows rank badges in mobile", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} />
    );
    const badges = document.querySelectorAll(".md\\:hidden .rounded-full");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].textContent).toBe("1");
  });
});
