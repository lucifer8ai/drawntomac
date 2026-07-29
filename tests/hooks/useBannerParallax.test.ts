import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBannerParallax } from "@/hooks/useBannerParallax";

function mockMatchMedia(matchesMap: Record<string, boolean> = {}) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(
      (query: string) =>
        ({
          matches: matchesMap[query] ?? false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) satisfies MediaQueryList,
    ),
  });
}

describe("useBannerParallax", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref object", () => {
    mockMatchMedia();
    const { result } = renderHook(() => useBannerParallax());
    expect(result.current).toHaveProperty("current");
    expect(result.current.current).toBeNull();
  });

  it("does not attach scroll listener when prefers-reduced-motion is set", () => {
    mockMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useBannerParallax());

    const scrollCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "scroll",
    );
    expect(scrollCalls.length).toBe(0);
  });

  it("does not attach scroll listener on mobile viewport", () => {
    mockMatchMedia({ "(min-width: 768px)": false });
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useBannerParallax());

    const scrollCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "scroll",
    );
    expect(scrollCalls.length).toBe(0);
  });

  it("cleans up on unmount", () => {
    mockMatchMedia({ "(min-width: 768px)": true });

    const { unmount } = renderHook(() => useBannerParallax());
    unmount();
  });
});
