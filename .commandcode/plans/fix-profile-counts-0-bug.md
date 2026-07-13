# Fix: Profile taste stats show 0 for likes/dislikes

## Root Cause

`useProfileStats.ts` has a type-name mismatch between the database values and the counting keys:

| DB `type` column | `ProfileTasteStats` key | `t in counts` result |
|---|---|---|
| `'like'` | `'liked'` | **false** — skipped |
| `'dislike'` | `'disliked'` | **false** — skipped |
| `'heard'` | `'heard'` | true — counted |
| `'want'` | `'want'` | true — counted |

The `if (t in counts)` guard at line 34 silently drops all like and dislike entries. Heard and want work because their names match across DB and TypeScript.

## Fix

**File:** `src/hooks/useProfileStats.ts`

Add a mapping from database `type` values to the display keys used in `ProfileTasteStats`, then apply it in the counting loop:

```ts
const DB_TYPE_TO_STATS_KEY: Record<string, keyof ProfileTasteStats> = {
  heard: "heard",
  like: "liked",
  dislike: "disliked",
  want: "want",
};
```

Replace the counting loop (lines 32-35) to use the mapping:

```ts
for (const row of data ?? []) {
  const statsKey = DB_TYPE_TO_STATS_KEY[row.type];
  if (statsKey) counts[statsKey] = (counts[statsKey] || 0) + 1;
}
```

This preserves the past-tense UI keys (`liked`/`disliked`) used in `ProfileStatsRow.tsx` while correctly mapping database values.

## Verification

1. Run the app locally, log a like and a dislike on different songs
2. Open the profile sheet — both counts should reflect the correct numbers
3. Check the public profile at `/user/$username` — same counts
4. Toggle a like off and on — count should decrement then increment correctly
5. Verify heard and want counts still work (they should be unaffected since the mapping is a no-op for those values)

## GSTACK REVIEW REPORT

| Run | Status | Findings |
|-----|--------|----------|
| 1 | COMPLETE | 1 bug found: type-name mismatch in useProfileStats causes like/dislike counts to always be 0 |

**VERDICT:** Single-line logic bug with a two-line fix. The `ProfileTasteStats` interface uses past-tense keys (`liked`/`disliked`) while the DB stores present-tense values (`like`/`dislike`). The `t in counts` guard silently filters mismatches. Fix: map DB types to stats keys before incrementing.

NO UNRESOLVED DECISIONS
