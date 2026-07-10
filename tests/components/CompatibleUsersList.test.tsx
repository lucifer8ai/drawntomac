import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompatibleUsersList } from "@/components/feed/CompatibleUsersList";

describe("CompatibleUsersList", () => {
  const baseUser = {
    userId: "u1",
    username: "alice",
    displayName: "Alice",
    avatarUrl: null,
    sharedSongs: 7,
    likedSongs: ["Track A", "Track B"],
    wantSongs: ["Track C"],
  };

  it("returns null when anonymous", () => {
    const { container } = render(
      <CompatibleUsersList users={[]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders loading skeletons", () => {
    render(
      <CompatibleUsersList users={[]} loading error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    const skeletons = document.querySelectorAll(".animate-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error with retry button", () => {
    const retry = vi.fn();
    render(
      <CompatibleUsersList users={[]} loading={false} error="Oops" retry={retry} isEmpty={false} isAnonymous={false} />
    );
    expect(screen.getByText("Oops")).toBeTruthy();
    screen.getByText("Try Again").click();
    expect(retry).toHaveBeenCalled();
  });

  it("shows empty state message", () => {
    render(
      <CompatibleUsersList users={[]} loading={false} error={null} retry={() => {}} isEmpty isAnonymous={false} />
    );
    expect(screen.getByText(/Add songs to your diary/)).toBeTruthy();
  });

  it("renders mobile cards with user data", () => {
    render(
      <CompatibleUsersList users={[baseUser]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    const mobileContainer = document.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeTruthy();
    expect(mobileContainer!.textContent).toContain("Alice");
    expect(mobileContainer!.textContent).toContain("7 songs in common");
    expect(mobileContainer!.textContent).toContain("Track A");
    expect(mobileContainer!.textContent).toContain("Track B");
    expect(mobileContainer!.textContent).toContain("Track C");
  });

  it("renders desktop wider cards", () => {
    render(
      <CompatibleUsersList users={[baseUser]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    const desktopContainer = document.querySelector(".hidden.md\\:block");
    expect(desktopContainer).toBeTruthy();
  });

  it("shows avatar or initial", () => {
    const withAvatar = { ...baseUser, avatarUrl: "http://img.com/av.jpg" };
    render(
      <CompatibleUsersList users={[withAvatar]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    const img = document.querySelector("img[src='http://img.com/av.jpg']");
    expect(img).toBeTruthy();
  });

  it("falls back to username when no display name", () => {
    const noDisplay = { ...baseUser, displayName: null, username: "bob123" };
    render(
      <CompatibleUsersList users={[noDisplay]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    const instances = screen.getAllByText("bob123");
    expect(instances.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show taste sections when empty", () => {
    const noTaste = { ...baseUser, likedSongs: [], wantSongs: [] };
    render(
      <CompatibleUsersList users={[noTaste]} loading={false} error={null} retry={() => {}} isEmpty={false} isAnonymous={false} />
    );
    expect(screen.queryByText(/Likes:/)).toBeFalsy();
    expect(screen.queryByText(/Wants:/)).toBeFalsy();
  });
});
