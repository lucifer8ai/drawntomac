import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// matchMedia needed by TasteBarChart for reduced motion check
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockReturnValue({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } satisfies MediaQueryList),
});

import { ProfileTasteCard } from "@/components/profile/ProfileTasteCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const EMPTY_STATS = { heard: 0, liked: 0, disliked: 0, want: 0, review: 0 };
const ACTIVE_STATS = { heard: 142, liked: 89, disliked: 8, want: 23, review: 5 };

describe("ProfileTasteCard", () => {
  it("renders loading skeleton when loading", () => {
    const { container } = render(
      <ProfileTasteCard
        stats={EMPTY_STATS}
        loading={true}
        error={null}
        isOwnProfile={false}
        username="testuser"
      />,
    );

    const skeletons = container.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText("Taste profile")).not.toBeInTheDocument();
  });

  it("renders error state with retry button", () => {
    const onRetry = vi.fn();
    render(
      <ProfileTasteCard
        stats={EMPTY_STATS}
        loading={false}
        error="Failed to load"
        isOwnProfile={false}
        username="testuser"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Couldn't load taste stats.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders active card with bar chart and narrative", () => {
    render(
      <ProfileTasteCard
        stats={ACTIVE_STATS}
        loading={false}
        error={null}
        isOwnProfile={false}
        username="testuser"
      />,
    );

    expect(screen.getByText(/@testuser/)).toBeInTheDocument();
    // heard=142 → 106-149 band → 60%
    expect(screen.getByText("60%")).toBeInTheDocument();
    // liked=89 → 40-99 band → 25%
    expect(screen.getByText("25%")).toBeInTheDocument();
    // disliked=8 → 1-15 band → 12%
    expect(screen.getByText("12%")).toBeInTheDocument();
    // want=23 → 11-39 band → 27%
    expect(screen.getByText("27%")).toBeInTheDocument();
  });

  it("renders TASTE PROFILE heading in all non-loading states", () => {
    render(
      <ProfileTasteCard
        stats={ACTIVE_STATS}
        loading={false}
        error={null}
        isOwnProfile={false}
        username="testuser"
      />,
    );

    expect(screen.getByText("Taste profile")).toBeInTheDocument();
  });

  it("renders all five bars at 0% when all stats are zero", () => {
    render(
      <ProfileTasteCard
        stats={EMPTY_STATS}
        loading={false}
        error={null}
        isOwnProfile={false}
        username="testuser"
      />,
    );

    expect(screen.getByText("Heard")).toBeInTheDocument();
    expect(screen.getByText("Liked")).toBeInTheDocument();
    expect(screen.getByText("Disliked")).toBeInTheDocument();
    expect(screen.getByText("Want")).toBeInTheDocument();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();

    const zeroPercents = screen.getAllByText("0%");
    expect(zeroPercents).toHaveLength(5);
  });

  it("renders empty-state narrative with CTA for own profile", () => {
    render(
      <ProfileTasteCard
        stats={EMPTY_STATS}
        loading={false}
        error={null}
        isOwnProfile={true}
        username="testuser"
      />,
    );

    expect(
      screen.getByText(/Your taste profile is waiting/),
    ).toBeInTheDocument();
    expect(screen.getByText("Explore music")).toBeInTheDocument();
  });

  it("renders empty-state narrative for other profile", () => {
    render(
      <ProfileTasteCard
        stats={EMPTY_STATS}
        loading={false}
        error={null}
        isOwnProfile={false}
        username="otheruser"
      />,
    );

    expect(
      screen.getByText(/taste profile is a blank slate/),
    ).toBeInTheDocument();
    expect(screen.queryByText("Explore music")).not.toBeInTheDocument();
  });

  it("shows raw count in tooltip on hover", () => {
    render(
      <ProfileTasteCard
        stats={ACTIVE_STATS}
        loading={false}
        error={null}
        isOwnProfile={false}
        username="testuser"
      />,
    );

    const heardPct = screen.getByText("60%");
    expect(heardPct).toHaveAttribute("title", "142 songs");
  });
});
