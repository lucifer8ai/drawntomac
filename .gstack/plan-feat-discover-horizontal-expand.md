# Plan: Horizontal "Show More" for d.you Artist Album List

**Branch:** `feat/discover-page`
**Date:** 2026-08-02
**Summary:** When user clicks "+N more" on a #d.you artist's album row, the additional albums should continue in the same horizontal scroll container instead of dropping into a separate row below.

---

## Problem

Currently in `DiscoverFeedSection.tsx`, `ArtistSection` has two rendering modes:

1. **Collapsed (default):** First 5 albums in a horizontal scroll row. A `+N more` pill sits inline at the end.
2. **Expanded (clicked):** First 5 albums stay in the scroll row. Albums 6+ render in a **separate `flex flex-wrap` container below**, with a "Show less" button.

The user wants expanded mode to keep everything in the **same horizontal scroll row** — just append the remaining albums after the existing ones, no second container.

## Root Cause

Lines 93-103 in `DiscoverFeedSection.tsx`:

```tsx
{expanded && artist.albums.length > maxVisible && (
  <div className="flex flex-wrap gap-3 mt-3">
    {artist.albums.slice(maxVisible).map((album) => (
      <AlbumCard key={album.releaseGroupId} album={album} />
    ))}
    <button onClick={() => setExpanded(false)}>Show less</button>
  </div>
)}
```

This renders the extra albums outside the horizontal scroll row.

## Solution

**Delete the separate expanded container.** Instead, when `expanded` is `true`, render all `artist.albums` (unsliced) directly in the existing horizontal scroll `div`. The scroll container already has `overflow-x-auto scrollbar-none` — it handles however many albums are in it.

The "Show less" button moves to below the scroll row, aligned to the right, as a small standalone element (not inside the scroll).

### Data flow

```
before:
  visibleAlbums = expanded ? albums : albums.slice(0, 5)
  <scroll-row>
    {visibleAlbums}
    {!expanded && remaining > 0 && <+N more pill>}
  </scroll-row>
  {expanded && <separate-flex-wrap>{albums[5..] + "Show less"}</separate-flex-wrap>}

after:
  <scroll-row>
    {expanded ? albums : albums.slice(0, 5)}
    {!expanded && remaining > 0 && <+N more pill>}
  </scroll-row>
  {expanded && remaining > 0 && <"Show less" button below row, right-aligned>}
```

### Before / After (ASCII)

```
BEFORE:
  [A1] [A2] [A3] [A4] [A5] [+3 more]          ← scroll row
  [A6] [A7] [A8] Show less                     ← separate flex-wrap below

AFTER:
  [A1] [A2] [A3] [A4] [A5] [A6] [A7] [A8]     ← all in scroll row
                                           Show less  (below, right-aligned)
```

## Changes

**File:** `src/components/feed/DiscoverFeedSection.tsx`
**Lines affected:** 50-105 (ArtistSection component)

Three edits:

1. **Remove `visibleAlbums` variable** (line 52) — no longer needed to disambiguate two containers. Replace its usage with inline ternary: `expanded ? artist.albums : artist.albums.slice(0, maxVisible)`.

2. **In the scroll row** (line 78): use the inline ternary directly in the `.map()`.

3. **Delete the separate flex-wrap div** (lines 93-103). Replace with a standalone "Show less" button below the scroll row (outside it, not in the scroll flow).

```tsx
function ArtistSection({ artist, maxVisible = 5 }: { artist: ArtistAlbumFeed; maxVisible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = artist.albums.length - maxVisible;

  return (
    <div className="mb-6">
      {/* artist header unchanged */}
      ...
      <div
        className="flex gap-3 overflow-x-auto scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}
        aria-label={`Albums by ${artist.artistName}`}
      >
        {(expanded ? artist.albums : artist.albums.slice(0, maxVisible)).map((album) => (
          <AlbumCard key={album.releaseGroupId} album={album} />
        ))}
        {!expanded && remaining > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 snap-start w-[88px] md:w-[140px] aspect-square rounded-2xl border border-border bg-raised flex items-center justify-center hover:bg-white/[0.03] transition-colors active:scale-[0.97]"
          >
            <span className="text-sm font-medium text-muted-foreground">+{remaining} more</span>
          </button>
        )}
      </div>
      {expanded && remaining > 0 && (
        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Show less
          </button>
        </div>
      )}
    </div>
  );
}
```

## Edge Cases

| Case | Behavior |
|------|----------|
| Artist has ≤5 albums | No "+N more" pill. No "Show less". Nothing changes. |
| Artist has 6+ albums, not expanded | First 5 shown in scroll row, "+N more" pill at end. |
| Artist has 6+ albums, expanded | All albums show in scroll row. "Show less" below. |
| Artist has many albums (50+) | Scrollable row handles it. `scrollbar-none` keeps it clean. |
| Re-click to collapse | `expanded` → `false`, back to 5 albums + pill. |
| Multiple artists expanded simultaneously | Each `ArtistSection` has its own `expanded` state — independent. |

## NOT in scope

- No backend changes, no RPC changes.
- No pagination — all data is already client-side.
- No scroll-to-top/focus behavior on expand/collapse.
- No animation/transition (stretch goal, not needed).

## Risk

**Zero risk.** This is a pure layout change. Same data, same component tree, same number of rendered elements. Only DOM structure changes — albums move from a sibling `div` to the scroll `div`. No new state, no new API calls.

---

## GSTACK REVIEW REPORT

| Runs / Status | Findings |
|---|---|
| Architecture | **PASS** — Single-component layout change. No new abstractions, no data flow changes. |
| Code Quality | **PASS** — Simplifies code: removes `visibleAlbums` variable, removes duplicate rendering path. Net fewer lines. |
| Tests | **PASS** — No test changes needed. Pure layout change with no new logic branches. Existing E2E/manual smoke test covers the scroll row. |
| Performance | **PASS** — Same number of DOM nodes. Same number of renders. Horizontal scroll already handles many items natively. |

**VERDICT: Ship it.** One file, three localized edits, pure layout consolidation.

NO UNRESOLVED DECISIONS
