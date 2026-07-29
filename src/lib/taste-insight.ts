/**
 * Derives a narrative insight from taste profile stats.
 *
 * ASSUMPTION: Like/Dislike are gated behind Heard in the UI, so
 * (liked > 0 || disliked > 0) implies heard > 0. If this constraint
 * is relaxed, the "heard-only" and "mostly-disliked" cases remain
 * correct, but the default fallback still produces a useful output.
 */
export interface TasteStats {
  heard: number;
  liked: number;
  disliked: number;
  want: number;
}

export function deriveTasteInsight(stats: TasteStats): string | null {
  const { heard, liked, disliked, want } = stats;
  const total = heard + liked + disliked + want;

  if (total === 0) return null;

  if (liked === 0 && disliked === 0 && want === 0 && heard > 0) {
    return "Just logging the journey — one song at a time.";
  }
  if (disliked > liked && disliked > heard) {
    return "Has strong opinions — knows what they don't like.";
  }
  if (liked > disliked && want > heard) {
    return "More discovery than completion — always looking forward.";
  }
  if (liked > disliked && heard > want) {
    return "Listens deeply — more likes than skips, more history than wishlist.";
  }
  if (heard > liked && heard > want && heard > disliked) {
    return "A completist — logs what they've experienced, not what they're chasing.";
  }
  if (want > heard && want > liked) {
    return "Forward-looking — the wishlist runs longer than the history.";
  }
  return "Measured and intentional — every entry counts.";
}
