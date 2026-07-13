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

  const defaultProps = {
    socialProof: new Map<string, number>(),
    userInteractions: new Map<string, Set<string>>(),
    currentUserId: null,
    onSearch: undefined as (() => void) | undefined,
  };

  it("renders loading skeletons", () => {
    render(
      <TrendingList songs={[]} loading error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error with retry button", () => {
    const retry = vi.fn();
    render(
      <TrendingList songs={[]} loading={false} error="Something went wrong" retry={retry} isEmpty={false} {...defaultProps} />
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    screen.getByText("Try Again").click();
    expect(retry).toHaveBeenCalled();
  });

  it("renders empty state", () => {
    render(
      <TrendingList songs={[]} loading={false} error={null} retry={() => {}} isEmpty emptyMessage="Nothing here!" {...defaultProps} />
    );
    expect(screen.getByText("Nothing here!")).toBeTruthy();
  });

  it("renders mobile cards with data", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeTruthy();
    expect(mobileContainer!.textContent).toContain("Test Song");
    expect(mobileContainer!.textContent).toContain("Test Artist");
  });

  it("renders null album art fallback", () => {
    const song = { ...baseSong, albumArtUrl: null };
    render(
      <TrendingList songs={[song]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer!.querySelector("img")).toBeFalsy();
  });

  it("omits null artist", () => {
    const song = { ...baseSong, artistName: null };
    render(
      <TrendingList songs={[song]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer!.textContent).not.toContain("Test Artist");
  });

  it("renders desktop table layout", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const tableContainer = document.querySelector(".hidden.md\\:block");
    expect(tableContainer).toBeTruthy();
  });

  it("renders mobile cards with links", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const link = document.querySelector(".md\\:hidden a[href='/song/test-song']");
    expect(link).toBeTruthy();
  });

  it("shows rank badges in mobile", () => {
    render(
      <TrendingList songs={[baseSong]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const badges = document.querySelectorAll(".md\\:hidden .rounded-full");
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].textContent).toBe("1");
  });

  it("shows why trending context line", () => {
    const likedSong = { ...baseSong, likeCount: 10, heardCount: 5, reviewCount: 3 };
    render(
      <TrendingList songs={[likedSong]} loading={false} error={null} retry={() => {}} isEmpty={false} {...defaultProps} />
    );
    const matches = screen.getAllByText(/10 people liked this/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows social proof when matchCount > 0", () => {
    const social = new Map<string, number>();
    social.set("1", 3);
    render(
      <TrendingList
        songs={[baseSong]}
        loading={false}
        error={null}
        retry={() => {}}
        isEmpty={false}
        socialProof={social}
        userInteractions={new Map()}
        currentUserId="me"
      />
    );
    expect(screen.getByText(/3 of your matches like this/)).toBeTruthy();
  });

  it("shows your take badge for heard interaction", () => {
    const interactions = new Map<string, Set<string>>();
    interactions.set("1", new Set(["heard"]));
    render(
      <TrendingList
        songs={[baseSong]}
        loading={false}
        error={null}
        retry={() => {}}
        isEmpty={false}
        socialProof={new Map()}
        userInteractions={interactions}
        currentUserId="me"
      />
    );
    const badge = document.querySelector(".text-green-500");
    expect(badge).toBeTruthy();
  });

  it("shows your take badge for like interaction", () => {
    const interactions = new Map<string, Set<string>>();
    interactions.set("1", new Set(["like"]));
    render(
      <TrendingList
        songs={[baseSong]}
        loading={false}
        error={null}
        retry={() => {}}
        isEmpty={false}
        socialProof={new Map()}
        userInteractions={interactions}
        currentUserId="me"
      />
    );
    const badge = document.querySelector(".text-red-500");
    expect(badge).toBeTruthy();
  });

  it("shows Search button in empty state when onSearch is provided", () => {
    const onSearch = vi.fn();
    render(
      <TrendingList
        songs={[]}
        loading={false}
        error={null}
        retry={() => {}}
        isEmpty
        emptyMessage="Search for a song to get started."
        socialProof={new Map()}
        userInteractions={new Map()}
        currentUserId="me"
        onSearch={onSearch}
      />
    );
    expect(screen.getByText("Search")).toBeTruthy();
    screen.getByText("Search").click();
    expect(onSearch).toHaveBeenCalled();
  });
});
