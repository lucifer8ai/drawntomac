import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiaryCard, type DiaryCardData } from "../../src/components/feed/DiaryCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, params }: any) => (
    <a href={`/song/${params.slug}`} className={className}>{children}</a>
  ),
}));

const baseData: DiaryCardData = {
  songId: "1",
  songTitle: "Test Song",
  songSlug: "test-song",
  artistName: "Test Artist",
  albumArtUrl: null,
  heard: false,
  liked: false,
  disliked: false,
  reviewed: false,
  want: false,
};

describe("DiaryCard", () => {
  it("renders song title and artist", () => {
    render(<DiaryCard data={baseData} />);
    expect(screen.getByText("Test Song")).toBeTruthy();
    expect(screen.getByText("Test Artist")).toBeTruthy();
  });

  it("renders heard badge", () => {
    render(<DiaryCard data={{ ...baseData, heard: true }} />);
    expect(screen.getByText(/heard/)).toBeTruthy();
  });

  it("renders liked badge", () => {
    render(<DiaryCard data={{ ...baseData, liked: true }} />);
    expect(screen.getByText(/liked/)).toBeTruthy();
  });

  it("renders disliked badge", () => {
    render(<DiaryCard data={{ ...baseData, disliked: true }} />);
    expect(screen.getByText(/disliked/)).toBeTruthy();
  });

  it("renders reviewed badge", () => {
    render(<DiaryCard data={{ ...baseData, reviewed: true }} />);
    expect(screen.getByText(/reviewed/)).toBeTruthy();
  });

  it("renders want badge", () => {
    render(<DiaryCard data={{ ...baseData, want: true }} />);
    expect(screen.getByText(/want/)).toBeTruthy();
  });

  it("badge container uses flex-wrap", () => {
    render(<DiaryCard data={{ ...baseData, heard: true, liked: true }} />);
    const badges = screen.getByText(/heard/).parentElement!;
    expect(badges.className).toContain("flex-wrap");
  });

  it("link points to song slug", () => {
    render(<DiaryCard data={baseData} />);
    const link = screen.getByText("Test Song").closest("a")!;
    expect(link.getAttribute("href")).toBe("/song/test-song");
  });

  it("renders album art when provided", () => {
    render(
      <DiaryCard
        data={{ ...baseData, albumArtUrl: "https://example.com/img.jpg" }}
      />
    );
    const img = document.querySelector("img") as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toBe("https://example.com/img.jpg");
  });

  it("renders placeholder when no album art", () => {
    render(<DiaryCard data={baseData} />);
    expect(screen.getByText("—")).toBeTruthy();
  });
});
