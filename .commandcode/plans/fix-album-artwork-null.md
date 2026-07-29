# Fix: Albums with missing artwork (NULL `release_groups.image_url`)

## Problem

Some albums have NULL `release_groups.image_url` even though their child songs have valid `genius_thumbnail_url`. The album page shows a placeholder instead of artwork. Example: AP Dhillon's "Okay/STFU" — 2 songs both have artwork, album page shows placeholder.

## Root Cause

**Two-layer bug:**

1. **Import scripts overwrite `image_url` with NULL during upsert.** All three import paths include `image_url` in their release group upsert. When a track fails to get Genius artwork (no token, rate limit, or no match), the NULL value wipes the previously-set `image_url` because Supabase `upsert` merges all keys — it doesn't skip NULLs.

2. **`album.$slug.tsx` has no fallback logic.** It reads `album.image_url` directly and shows a placeholder SVG when NULL. Unlike the song page (which uses `get_song_artwork_url()` with a `genius_thumbnail_url` fallback), the album page never tries to pull artwork from child songs.

### Data flow of the bug

```
seed-canon.ts processes 2 songs in same release group:

Song 1: Genius OK -> artworkUrl set -> RG upsert: image_url = "/storage/abc.jpg"  OK
Song 2: Genius FAIL -> artworkUrl = null -> RG upsert: image_url = NULL            WIPES!

Album page loads -> album.image_url = NULL -> shows placeholder
Song page loads -> get_song_artwork_url() -> falls back to genius_thumbnail_url -> shows artwork OK
```

### Affected import paths

All three import paths are affected:

| Script | How it creates the bug |
|---|---|
| `scripts/seed-canon.ts` | `upsert({ ..., image_url: artworkUrl })` — NULL overwrites good value from previous song in same RG |
| `src/lib/song-import.ts` (`upsertReleaseGroup`) | `upsert({ ..., image_url: params.imageUrl })` — same pattern |
| `scripts/import-artist.ts` | `upsert({ ..., image_url: null })` at RG creation, then tracks update later — but if first track fails Genius, RG stays NULL |

## Fix: Three changes (4 files + 1 migration)

### 1. Backfill NULL `image_url` from child songs (data fix)

```sql
-- supabase/migrations/<timestamp>_backfill_null_album_artwork.sql

UPDATE release_groups rg
SET image_url = (
  SELECT s.genius_thumbnail_url
  FROM songs s
  WHERE s.release_group_id = rg.id
    AND s.genius_thumbnail_url IS NOT NULL
  ORDER BY s.release_date DESC NULLS LAST
  LIMIT 1
)
WHERE rg.image_url IS NULL
  AND EXISTS (
    SELECT 1 FROM songs s
    WHERE s.release_group_id = rg.id
      AND s.genius_thumbnail_url IS NOT NULL
  );
```

Picks the newest song's artwork as the album cover. Verify with:

```sql
SELECT COUNT(*) FROM release_groups rg
WHERE rg.image_url IS NULL
  AND EXISTS (SELECT 1 FROM songs s WHERE s.release_group_id = rg.id AND s.genius_thumbnail_url IS NOT NULL);
-- Should return 0
```

### 2. Defensive fallback in album page loader + component (code fix)

**`src/routes/album.$slug.tsx`:**

Loader: add `genius_thumbnail_url` to songs select, find first song with artwork.

```typescript
const { data: songs } = await supabase
  .from("songs")
  .select("id, title, slug, track_number, genius_thumbnail_url")
  .eq("release_group_id", album.id)
  .order("track_number", { ascending: true, nullsFirst: false });

const fallbackArtwork = (
  (songs ?? []).find((s: any) => s.genius_thumbnail_url) as any
)?.genius_thumbnail_url ?? null;

return { album: ..., songs: ..., fallbackArtwork };
```

Component: add `fallbackArtwork` between `image_url` and placeholder.

```tsx
{album.image_url ? (
  <img src={album.image_url} ... />
) : fallbackArtwork ? (
  <img src={fallbackArtwork} ... />
) : (
  <div>/* placeholder SVG */</div>
)}
```

### 3. Prevent future NULL overwrites (pipeline fix)

**`scripts/seed-canon.ts` (~line 335-348):**

```typescript
const rgRow: Record<string, any> = {
  musicbrainz_id: releaseGroupMbid,
  title: releaseGroupTitle || title,
  slug: rgSlug,
  artist_id: dbArtistId,
  primary_type: rgPrimaryType ?? null,
  release_date: releaseDate,
};
if (artworkUrl) rgRow.image_url = artworkUrl;
```

**`src/lib/song-import.ts` (`upsertReleaseGroup`, ~lines 90-102):**

```typescript
const rgRow: Record<string, any> = {
  musicbrainz_id: params.musicbrainzId,
  title: params.title,
  slug,
  artist_id: params.artistId,
  primary_type: params.primaryType ?? null,
  release_date: params.releaseDate,
};
if (params.imageUrl) rgRow.image_url = params.imageUrl;
```

**`scripts/import-artist.ts` (~line 469):**

The initial RG creation at line 462-469 sets `image_url: null` — this should conditionally omit it too:

```typescript
const rgRow: Record<string, any> = {
  musicbrainz_id: rg.id,
  title: rgTitle,
  slug: rgSlug,
  artist_id: artistId,
  primary_type: rgType,
  release_date: normalizeDate(pick.date),
};
// Don't set image_url at creation — tracks will update it later
```

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/<timestamp>_backfill_null_album_artwork.sql` | NEW: One-shot backfill of NULL `image_url` from child songs |
| `src/routes/album.$slug.tsx` | MODIFY: loader fetches `genius_thumbnail_url` on songs, adds `fallbackArtwork`; component uses it |
| `tests/routes/album.$slug.test.tsx` | MODIFY: add 2 tests — artwork when `image_url` set, fallback when only song has artwork |
| `scripts/seed-canon.ts` | MODIFY: conditionally include `image_url` in release group upsert |
| `src/lib/song-import.ts` | MODIFY: conditionally include `image_url` in `upsertReleaseGroup` |
| `scripts/import-artist.ts` | MODIFY: conditionally include `image_url` in release group creation |

## Edge cases handled

- **Album with 0 songs:** `fallbackArtwork` stays null, shows placeholder. OK
- **Album where ALL songs also have NULL artwork:** `fallbackArtwork` stays null, shows placeholder. OK
- **Album where some songs have artwork, some don't:** picks first song with artwork. OK
- **Re-seeding after fix:** existing `image_url` is preserved when Genius fails. OK
- **First-time import with no Genius artwork:** `image_url` stays NULL (not overwritten by subsequent empty upserts). OK
- **`import-artist.ts` creates RG without artwork, later track updates it:** works as before, just RG stays NULL a bit longer. First track always sets it. OK

## Verification

1. Run backfill migration, verify zero remaining NULL albums with artwork-bearing songs
2. Visit `/album/okay-stfu` — album page shows artwork matching song pages
3. `npx vitest run tests/routes/album.$slug.test.tsx` — all pass
4. `npx tsx scripts/seed-canon.ts --dry-run` — no regressions
5. Import a new artist with `GENIUS_ACCESS_TOKEN` unset — `image_url` stays NULL (not wiped)

## GSTACK REVIEW REPORT

| Section | Status | Findings |
|---|---|---|
| Architecture | PASS | Three-layer approach (backfill → fallback → prevention) covers past, present, and future. No extra DB round-trips. |
| Code Quality | PASS | Consistent with existing patterns. Component fallback chain is readable. No new abstractions. |
| Tests | NEEDS | Two new test cases needed: artwork when `image_url` is set, and fallback when only child song has artwork. Script tests deferred (simple conditionals). |
| Performance | PASS | Backfill uses EXISTS guard + indexed FK. Loader adds one TEXT column to existing select. No overhead. |

VERDICT: APPROVE. 6 files, zero new abstractions, fixes root cause + all 3 import paths + adds defensive fallback.

NO UNRESOLVED DECISIONS
