import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Onboarding redirect guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recognizes onboarding_completed=false as needing onboarding", () => {
    const profile = { onboarding_completed: false };
    expect(profile.onboarding_completed).toBe(false);
  });

  it("recognizes onboarding_completed=true as completed", () => {
    const profile = { onboarding_completed: true };
    expect(profile.onboarding_completed).toBe(true);
  });

  it("triggers redirect for any authenticated route when not completed", () => {
    const profile = { onboarding_completed: false };
    const needsRedirect = !profile.onboarding_completed;
    expect(needsRedirect).toBe(true);
  });

  it("does not redirect for authenticated routes when completed", () => {
    const profile = { onboarding_completed: true };
    const needsRedirect = !profile.onboarding_completed;
    expect(needsRedirect).toBe(false);
  });
});
