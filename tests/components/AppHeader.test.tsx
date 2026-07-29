import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppHeader } from "../../src/components/AppHeader";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children }: any) => (
    <a href={to} className={className}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn() } },
}));

describe("AppHeader", () => {
  it("renders full logo on desktop-view (hidden md:inline span exists)", () => {
    render(<AppHeader activeTab="feed" onTabChange={() => {}} onProfileClick={() => {}} />);
    expect(screen.getByText("#d.To")).toBeTruthy();
    expect(screen.getByText("#drawnto")).toBeTruthy();
  });

  it("renders search button on mobile", () => {
    render(<AppHeader activeTab="feed" onTabChange={() => {}} onProfileClick={() => {}} />);
    const searchBtns = screen.getAllByRole("button").filter(
      (b) => b.querySelector("svg") && b.className.includes("md:hidden")
    );
    expect(searchBtns.length).toBeGreaterThan(0);
  });

  it("header nav tabs are hidden on mobile", () => {
    render(<AppHeader activeTab="feed" onTabChange={() => {}} onProfileClick={() => {}} />);
    const nav = screen.getByText("#d.Yours", { selector: "nav button" });
    const navEl = nav.closest("nav")!;
    expect(navEl.className).toContain("hidden");
    expect(navEl.className).toContain("md:flex");
  });

  it("avatar button opens profile sheet on click", () => {
    let clicked = false;
    render(<AppHeader activeTab="feed" onTabChange={() => {}} onProfileClick={() => { clicked = true; }} />);
    const avatarBtn = screen.getByTitle("Profile");
    avatarBtn.click();
    expect(clicked).toBe(true);
  });
});
