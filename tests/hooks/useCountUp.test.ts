import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountUp } from "@/hooks/useCountUp";

function setupMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } satisfies MediaQueryList),
  });
}

describe("useCountUp", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupMatchMedia(false);
  });

  it("returns 0 initially", () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(0);
  });

  it("returns target immediately when prefers-reduced-motion is set", () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(100);
  });

  it("returns 0 when target is 0", () => {
    const { result } = renderHook(() => useCountUp(0));
    expect(result.current).toBe(0);
  });

  it("starts counting up after mount (verifies animation fires)", async () => {
    const { result } = renderHook(() => useCountUp(100, 400));
    // Immediate render: 0
    expect(result.current).toBe(0);
    // After animation frame ticks, should be non-zero
    await vi.waitFor(() => expect(result.current).toBeGreaterThan(0), {
      timeout: 500,
    });
  });
});
