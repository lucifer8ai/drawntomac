import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyFeedState } from "../../src/components/feed/EmptyFeedState";
import { TabContext } from "../../src/routes/_authenticated/route";

function renderWithTabContext(ui: React.ReactElement, tabContextValue: any = {}) {
  const defaults = {
    activeTab: "feed" as const,
    setTab: vi.fn(),
    profile: null,
    discoverSection: "trending" as const,
    setDiscoverSection: vi.fn(),
    triggerSearch: vi.fn(),
    ...tabContextValue,
  };
  return render(
    <TabContext.Provider value={defaults}>
      {ui}
    </TabContext.Provider>,
  );
}

describe("EmptyFeedState", () => {
  it("shows discover prompt when following nobody", () => {
    renderWithTabContext(<EmptyFeedState followingCount={0} />);
    expect(screen.getByText(/Discover people/)).toBeTruthy();
    expect(screen.getByText("See who to follow")).toBeTruthy();
  });

  it("shows activity prompt when following but no activity", () => {
    renderWithTabContext(<EmptyFeedState followingCount={5} />);
    expect(screen.getByText(/haven't posted yet/)).toBeTruthy();
    expect(screen.getByText("Explore music")).toBeTruthy();
  });

  it("clicking explore button switches to discover tab", async () => {
    const mockSetTab = vi.fn();
    renderWithTabContext(<EmptyFeedState followingCount={5} />, { setTab: mockSetTab });
    await userEvent.click(screen.getByText("Explore music"));
    expect(mockSetTab).toHaveBeenCalledWith("discover");
  });

  it("clicking see who to follow switches to discover tab", async () => {
    const mockSetTab = vi.fn();
    renderWithTabContext(<EmptyFeedState followingCount={0} />, { setTab: mockSetTab });
    await userEvent.click(screen.getByText("See who to follow"));
    expect(mockSetTab).toHaveBeenCalledWith("discover");
  });
});
