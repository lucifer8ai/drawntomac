import type { CompatibleUser } from "@/hooks/useCompatibleUsers";

export function computeCompatibilityScore(user: CompatibleUser): number {
  return (
    user.sharedHeard * 1 +
    user.sharedLiked * 2 +
    user.sharedReviewed * 3 +
    user.sharedWant * 1.5 +
    user.sharedDisliked * 0.5
  );
}

export function getCompatibilityTier(score: number, maxScore: number): { label: string; color: string } | null {
  if (maxScore < 10) return null;

  const pct = score / maxScore;

  if (pct >= 0.85) return { label: "Taste Twin", color: "#a855f7" };
  if (pct >= 0.65) return { label: "High Match", color: "#facc15" };
  if (pct >= 0.4) return { label: "Good Match", color: "#8A8276" };
  return null;
}
