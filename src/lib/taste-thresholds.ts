/**
 * Maps raw diary entry counts to a tier-based percentage (0–100) for taste
 * profile bar visualization.
 *
 * Data flow:
 *   useProfileStats → { heard, liked, disliked, want }
 *       → getTastePercentage(type, count) → integer 0–100
 *       → TasteBarChart renders as bar fill width + percentage label
 *
 * Thresholds are curated per type. Terminal bands use Infinity.
 * Counts < 0 or NaN are silently clamped to 0.
 */
export type BarType = "heard" | "liked" | "disliked" | "want" | "review";

interface ThresholdBand {
  max: number; // inclusive upper bound (Infinity for terminal band)
  percentage: number; // integer 0–100
}

// Ordered ascending by max. First matching band wins.
const THRESHOLDS: Record<BarType, ThresholdBand[]> = {
  heard: [
    { max: 0, percentage: 0 },
    { max: 10, percentage: 8 },
    { max: 20, percentage: 15 },
    { max: 39, percentage: 27 },
    { max: 79, percentage: 46 },
    { max: 95, percentage: 50 },
    { max: 105, percentage: 55 },
    { max: 149, percentage: 60 },
    { max: 189, percentage: 73 },
    { max: 239, percentage: 81 },
    { max: 399, percentage: 95 },
    { max: Infinity, percentage: 100 },
  ],
  liked: [
    { max: 0, percentage: 0 },
    { max: 10, percentage: 10 },
    { max: 39, percentage: 18 },
    { max: 99, percentage: 25 },
    { max: 159, percentage: 33 },
    { max: 200, percentage: 55 },
    { max: 249, percentage: 63 },
    { max: 310, percentage: 78 },
    { max: 369, percentage: 88 },
    { max: 429, percentage: 94 },
    { max: 469, percentage: 99 },
    { max: Infinity, percentage: 100 },
  ],
  disliked: [
    { max: 0, percentage: 0 },
    { max: 15, percentage: 12 },
    { max: 59, percentage: 33 },
    { max: 99, percentage: 55 },
    { max: 149, percentage: 89 },
    { max: 199, percentage: 96 },
    { max: Infinity, percentage: 100 },
  ],
  want: [
    { max: 0, percentage: 0 },
    { max: 10, percentage: 19 },
    { max: 39, percentage: 27 },
    { max: 55, percentage: 55 },
    { max: 58, percentage: 78 },
    { max: 62, percentage: 88 },
    { max: 65, percentage: 95 },
    { max: Infinity, percentage: 100 },
  ],
  review: [
    { max: 0, percentage: 0 },
    { max: 10, percentage: 9 },
    { max: 20, percentage: 16 },
    { max: 39, percentage: 26 },
    { max: 79, percentage: 39 },
    { max: 95, percentage: 48 },
    { max: 105, percentage: 55 },
    { max: 149, percentage: 60 },
    { max: 189, percentage: 73 },
    { max: 239, percentage: 86 },
    { max: 399, percentage: 98 },
    { max: Infinity, percentage: 100 },
  ],
};

export function getTastePercentage(type: BarType, count: number): number {
  // Clamp invalid inputs silently — caller always passes valid diary counts,
  // but this is an exported public API.
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;

  const bands = THRESHOLDS[type];
  for (const band of bands) {
    if (safeCount <= band.max) return band.percentage;
  }
  return 100; // fallback — should never be reached with Infinity terminal
}
