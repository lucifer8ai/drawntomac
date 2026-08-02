# Engineering Review: Onboarding Artist Selection → Discover Feed Pipeline

**Question:** When a user selects 3 artists on onboarding, are those artists shown on the feed under artist releases?

**Short answer:** Yes, the pipeline works. But there are 6 issues worth fixing — one medium-severity context-loss bug, five low-severity polish items, and a missing test.

---

## Architecture

### Pipeline Overview

```
Onboarding Step 1 (ArtistSelector)
  → sessionStorage("onboarding_artists")
    → Onboarding Step 3 (CityStep)
      → profiles.discover_artist_ids (UUID[])
        → FeedPage → DiscoverFeedSection
          → useDiscoverFeed → supabase.rpc("get_discover_feed")
            → SQL: artists JOIN release_groups JOIN songs WHERE artist_id = ANY(discover_artist_ids)
              → groupFlatRows() → ArtistAlbumFeed[]
                → ArtistSection → AlbumCard (link to /album/$slug)
```

### Architecture Rating: Solid

The data flow is clean and linear. No parallel paths, no race conditions between writes. The `sessionStorage` bridge between steps 1 and 3 is appropriate — no need to persist partial selections to the DB mid-flow. The RPC is a straightforward flat join with client-side grouping, which is the right call for <500 rows.

The one architectural observation: `discover_artist_ids` lives on `profiles` as a `UUID[]`. This is fine for now (3-10 artists), but if feeds ever need to reference more than artist IDs (e.g., "show me releases from artists similar to my selected artists"), this flat array won't scale. Not a problem today — just noting the ceiling.

---

## Code Quality

### Issue 1 (Medium): Empty-state dialog loses previously-saved artist context

**File:** `src/components/feed/DiscoverFeedSection.tsx`, line 233

```tsx
// Current (empty-state branch)
<ArtistSelector selectedArtistIds={[]} onConfirm={handleArtistConfirm} />
```

When a user has `discover_artist_ids` in their profile but those artists have zero albums (e.g., an artist exists in the `artists` table but has no `release_groups`), the RPC returns zero rows → the empty state renders → the dialog opens with `selectedArtistIds={[]}`. The user's previously-saved selections are invisible and can't be removed or changed.

**Fix:** The empty-state dialog should pass the currently-saved artist IDs, not an empty array. This requires an additional query to `profiles.discover_artist_ids` (or lifting that state from the hook). Simplest approach: add `discoverArtistIds` to the `useDiscoverFeed` return type so the component always has access to the persisted list.

```tsx
// After fix
<ArtistSelector selectedArtistIds={savedArtistIds} onConfirm={handleArtistConfirm} />
```

---

### Issue 2 (Low): No-op save when confirming unchanged artist selections

**File:** `src/components/feed/DiscoverFeedSection.tsx`, `handleArtistConfirm` at line 180

When the user opens the "Edit Artists" dialog and clicks "Continue" without changing anything, `handleArtistConfirm` writes the same `discover_artist_ids` back to the DB and triggers an unnecessary `refresh()`. Harmless, but wasteful — an extra DB write + RPC round-trip.

**Fix:** Compare incoming `artistIds` with `feed.map(a => a.artistId)` before writing. Skip the update if identical.

```tsx
const currentIds = feed.map(a => a.artistId);
const unchanged = artistIds.length === currentIds.length && 
  artistIds.every((id, i) => id === currentIds[i]);
if (unchanged) { setModalOpen(false); return; }
```

---

### Issue 3 (Low): Silent failure when session expires mid-edit

**File:** `src/components/feed/DiscoverFeedSection.tsx`, line 183

```tsx
const { data: userData } = await supabase.auth.getUser();
if (!userData.user) return;  // dialog stays open, no error feedback
```

If the session expires between opening the dialog and confirming, the function returns silently. The dialog stays open, `updateSaving` resets to `false`, but the user sees no explanation.

**Fix:** Add a toast error before returning:

```tsx
if (!userData.user) {
  toast.error("Session expired. Please refresh and try again.");
  return;
}
```

---

### Issue 4 (Low): `max` prop mismatch between empty and edit states

**File:** `src/components/feed/DiscoverFeedSection.tsx`

- Empty-state dialog: `max` defaults to **3** (ArtistSelector's default)
- Edit artists dialog: `max={10}`

A user who picks 10 artists via the edit dialog, then later removes artists and hits the empty state, will only be offered "Pick up to 3 artists." This is confusing.

**Fix:** Pass `max={10}` explicitly in the empty-state dialog too, or document that the empty state is post-onboarding and should match the edit limit.

---

### Issue 5 (Low): Null release_date sorting pushes undated albums to the bottom

**File:** `supabase/migrations/20260728_fix_discover_feed_gate.sql`, line 30

```sql
ORDER BY a.name, rg.release_date DESC, COALESCE(s.track_number, 0)
```

PostgreSQL's `ORDER BY ... DESC` defaults to `NULLS LAST`. Albums with no release date appear after all dated albums. This isn't a bug, but it means newly-added MusicBrainz albums with null dates appear after 1990s albums with known dates — which feels wrong for a "discover new releases" feed.

**Fix:** Consider `rg.release_date DESC NULLS FIRST` if undated = "likely new," or add `COALESCE(rg.release_date, '1970-01-01'::date)` if they should be at the bottom.

---

## Tests

### Missing: No direct hook test for `useDiscoverFeed`

**File:** `src/hooks/useDiscoverFeed.ts` has no test file at `tests/hooks/useDiscoverFeed.test.ts`.

Existing tests mock the entire hook (`DiscoverFeedSection.test.tsx` mocks `useDiscoverFeed`), so `groupFlatRows()` — the client-side grouping logic — is never tested in isolation. If the RPC returns rows in an unexpected order, or if an artist has albums with no songs, `groupFlatRows()` has no direct test coverage.

**What exists:**
- `tests/components/DiscoverFeedSection.test.tsx` — good UI-level tests (loading/error/empty/edit states)
- `tests/components/OnboardingCityStep.test.tsx` — good coverage of `discover_artist_ids` being written
- `tests/components/ArtistSelector.test.tsx` — good selection UX tests

**What's missing:**
- No test for `groupFlatRows()`: empty rows → `[]`, single artist/album/song → correct shape, multiple artists with interleaved albums → correct grouping, artist with zero albums filtered out
- No test for `useDiscoverFeed`'s fetch/error/empty user flow
- No integration test tracing the full onboarding → feed data (manual QA path exists per the test plan doc)

**Recommendation:** Add `tests/hooks/useDiscoverFeed.test.ts` covering at minimum:
1. `groupFlatRows([])` → `[]`
2. Single artist, single album, single song → correct `ArtistAlbumFeed` shape
3. Two artists with interleaved rows → two `ArtistAlbumFeed` entries, albums correctly bucketed
4. Artist with no albums (no rows referencing it) → not in output

---

## Performance

### RPC Performance

The `get_discover_feed` RPC is efficient for the current scale:

```sql
SELECT ... FROM artists a
JOIN release_groups rg ON rg.artist_id = a.id
JOIN songs s ON s.release_group_id = rg.id
WHERE a.id = ANY(artist_ids)
ORDER BY a.name, rg.release_date DESC, COALESCE(s.track_number, 0)
LIMIT 500;
```

- **No subqueries, no DISTINCT, no window functions** — a straightforward three-table join.
- **LIMIT 500** caps result size regardless of artist discography size.
- **`ANY(artist_ids)`** with 3-10 UUIDs is efficient on indexed FK columns.

Indexes exist on `release_groups.artist_id`, `songs.release_group_id`, and `artists.id` (PK). No missing indexes here.

### Client-Side Grouping

`groupFlatRows()` does one pass over ≤500 rows with two `Map` lookups per row — O(n). Clean.

```typescript
artist.albums = Array.from(albumMap.values());
```

The `Array.from()` call for each artist is fine, but note it iterates `albumMap` once per artist after the main pass. The sort that the user sees depends entirely on the SQL `ORDER BY` — the client doesn't re-sort, which is correct. No performance concerns at this scale.

### Realtime / Staleness

The discover feed doesn't subscribe to realtime changes. A user who adds a new album to their library won't see it in the discover feed until they manually refresh or navigate away and back. The `refresh()` function is available but only called on "Edit Artists" confirm. Consider adding a pull-to-refresh or visibility-based refresh for the discover section — but this is a product decision, not a correctness issue.

---

## Summary Table

| # | Issue | Severity | File | Fix Effort |
|---|-------|----------|------|-----------|
| 1 | Empty-state dialog loses saved artists | Medium | `DiscoverFeedSection.tsx:233` | Small — pass saved IDs |
| 2 | No-op save on unchanged artist confirm | Low | `DiscoverFeedSection.tsx:180` | Trivial — compare before write |
| 3 | Silent failure on expired session | Low | `DiscoverFeedSection.tsx:183` | Trivial — add toast |
| 4 | max mismatch (3 vs 10) | Low | `DiscoverFeedSection.tsx` | Trivial — pass max=10 |
| 5 | Null release_date sorting | Low | `20260728_fix_discover_feed_gate.sql:30` | Trivial — add NULLS FIRST |
| 6 | Missing useDiscoverFeed hook test | Medium | `tests/hooks/` | Medium — new test file |

---

## GSTACK REVIEW REPORT

| Runs | Status | Findings |
|------|--------|----------|
| Architecture Review | ✅ Pass | Pipeline is clean; single RPC → client grouping; no race conditions |
| Code Quality Review | ⚠️ 5 Issues | 1 medium (Issue 1), 4 low (Issues 2-5) |
| Test Coverage Review | ⚠️ 1 Gap | Missing `useDiscoverFeed.test.ts` hook test |
| Performance Review | ✅ Pass | Efficient 3-table join with LIMIT 500; O(n) client grouping |

**VERDICT:** The pipeline works correctly — selected artists flow through onboarding → DB → RPC → feed. Ship the feature, but fix Issue 1 (medium) and add the missing hook test before or alongside. Issues 2-5 are polish — low effort, nice to include in this PR per the user's preference for fixing things now rather than accumulating TODOs.

NO UNRESOLVED DECISIONS
