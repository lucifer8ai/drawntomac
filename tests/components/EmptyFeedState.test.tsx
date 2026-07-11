import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyFeedState } from "../../src/components/feed/EmptyFeedState";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children, ...rest }: any) => (
    <a href={to} className={className} {...rest}>
      {children}
    </a>
  ),
}));

describe("EmptyFeedState", () => {
  it("shows discover prompt when following nobody", () => {
    render(<EmptyFeedState followingCount={0} />);
    expect(screen.getByText(/Discover people/)).toBeTruthy();
    expect(screen.getByText("See who to follow")).toBeTruthy();
  });

  it("shows activity prompt when following but no activity", () => {
    render(<EmptyFeedState followingCount={5} />);
    expect(screen.getByText(/haven't posted yet/)).toBeTruthy();
    expect(screen.getByText("Explore music")).toBeTruthy();
  });
});
