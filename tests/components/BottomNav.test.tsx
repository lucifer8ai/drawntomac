import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "../../src/components/nav/BottomNav";

describe("BottomNav", () => {
  it("renders all three tabs", () => {
    render(<BottomNav activeTab="feed" onTabChange={() => {}} />);
    expect(screen.getByText("Feed")).toBeTruthy();
    expect(screen.getByText("Diary")).toBeTruthy();
    expect(screen.getByText("Discover")).toBeTruthy();
  });

  it("marks active tab with primary color (CSS variable)", () => {
    render(<BottomNav activeTab="diary" onTabChange={() => {}} />);
    const diaryLabel = screen.getByText("Diary");
    expect(diaryLabel.style.color).toBe("var(--color-primary)");
  });

  it("inactive tabs have muted foreground color", () => {
    render(<BottomNav activeTab="feed" onTabChange={() => {}} />);
    const discoverLabel = screen.getByText("Discover");
    expect(discoverLabel.style.color).toBe("var(--color-muted-foreground)");
  });

  it("applies pb-safe class for safe area", () => {
    render(<BottomNav activeTab="feed" onTabChange={() => {}} />);
    const nav = screen.getByText("Feed").closest("nav")!;
    expect(nav.className).toContain("pb-safe");
  });

  it("is visible on mobile (fixed bottom nav)", () => {
    render(<BottomNav activeTab="feed" onTabChange={() => {}} />);
    const nav = screen.getByText("Feed").closest("nav")!;
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("bottom-0");
  });
});
