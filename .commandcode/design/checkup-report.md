# Design Checkup — drawnTo

**Date:** 2026-07-09
**Score:** 40/60
**Status:** Watch

---

## Vital Signs

| Vital | Score | Status |
|-------|-------|--------|
| 1. Intentionality | 10/10 | Healthy |
| 2. Readability | 5/10 | Watch |
| 3. Usability | 10/10 | Healthy |
| 4. Responsiveness | 5/10 | Watch |
| 5. Speed | 5/10 | Watch |
| 6. Accessibility | 5/10 | Watch |

---

## Vital 1: Intentionality — Healthy (10/10)

Distinctive, authored aesthetic. Not assembled from defaults.

- **Bespoke splash page:** Custom `ListenerWall` with SVG noise texture, Bebas Neue typography wall, animated pulse dot, stat callouts — `src/routes/index.tsx:57-125`
- **Cohesive palette:** Burnt rust primary (`oklch(0.66 0.18 35)`), named action colors, near-black with cool tint — `src/styles.css:66-106`
- **Intentional typography:** Outfit (sans) + Instrument Serif (serif) + JetBrains Mono (mono) + Bebas Neue (display) via Bunny CDN — `src/routes/__root.tsx:95-99`
- **Branded copy:** "#drawnTo", "i don't just listen, i feel it", "Log · Review · Connect" — `src/routes/index.tsx:191-197`

---

## Vital 2: Readability — Watch (5/10)

### Body Text Below 16px Minimum

| Component | Element | Size | Location |
|-----------|---------|------|----------|
| EntryCard | Feed body | 14px (`text-sm`) | `src/components/feed/EntryCard.tsx:67` |
| DiaryCard | Song title | 14px (`text-sm`) | `src/components/feed/DiaryCard.tsx:34` |
| DiaryCard | Artist name | 12px (`text-xs`) | `src/components/feed/DiaryCard.tsx:38` |
| ReviewComposer | Textarea (desktop) | 14px (`md:text-sm`) | `src/components/song/ReviewComposer.tsx:86` |
| ReviewComposer | Review body | 14px (`text-sm`) | `src/components/song/ReviewComposer.tsx:163` |
| ReviewList | Review body | 14px (`text-sm`) | `src/components/song/ReviewList.tsx:107` |
| Landing | Auth inputs (desktop) | 14px (`md:text-sm`) | `src/routes/index.tsx:228,243` |
| Landing | Stat labels | 10px (`text-[10px]`) | `src/routes/index.tsx:118,126` |
| BottomNav | Tab labels | 10px (`text-[10px]`) | `src/components/nav/BottomNav.tsx:39` |

**Impact:** Body reading text at 14px is below the 16px accessibility baseline. The 10px labels are near-illegible at normal viewing distances. Prescription: `/design typeset` — bump `text-sm` usage to `text-base` in reading contexts.

### Contrast Failures

| Pairing | Est. Ratio | WCAG AA |
|---------|------------|---------|
| `text-muted-foreground/60` on background | ~3.8:1 | ❌ Fails 4.5:1 |
| `text-foreground/40` on background | ~4.0:1 | ❌ Marginal |
| `text-white/20` on raised (CoverArt) | ~1.5:1 | ❌ Decorative only |

**Specific evidence:** `src/routes/index.tsx:196` — "Log · Review · Connect" at `text-muted-foreground/60` fails; `src/routes/index.tsx:119,128` — 10px + 40% opacity doubly fails.

### Line Heights — Adequate

- `text-sm` → 1.428 (Tailwind default): acceptable
- `leading-relaxed: 1.625` on review bodies: good
- `leading-snug: 1.375` on feed entries: acceptable

---

## Vital 3: Usability — Healthy (10/10)

### Primary Actions Clear
- "Heard" button with green fill + BookmarkCheck icon, explicit text — `ActionButtons.tsx:55`
- "Want to hear" with purple fill + icon, explicit label — `ActionButtons.tsx:88`
- Like (Heart) and Dislike (ThumbsDown) with fill-state feedback — `LikeDislike.tsx:58-76`

### Button Labels Specific
- "Post review" / "Save" — context-aware — `ReviewComposer.tsx:111`
- "Sign in to log listens." — explains the barrier — `ActionButtons.tsx:29`
- "Come in" / "Join the wall" — branded — `index.tsx:262`

### State Coverage — Comprehensive

| Page | Loading | Empty | Error | Not Found | 404 |
|------|---------|-------|-------|-----------|-----|
| FeedPage | ✅ Skeletons | ✅ "Your Feed is quiet" | ❌ Not surfaced | N/A | ✅ Root |
| DiaryPage | ✅ Skeletons | ✅ "No activity yet" | ❌ Not surfaced | N/A | N/A |
| DiscoverPage | ✅ Per-section | ✅ Per-section | ✅ Per-section retry | N/A | N/A |
| SongPage | ✅ ReviewSkeletons | ✅ "No reviews yet" | ✅ Error boundary | ✅ | N/A |

**Weak spot:** FeedPage and DiaryPage silently swallow query errors — no user-facing error UI.

---

## Vital 4: Responsiveness — Watch (5/10)

### Breakpoints ✅
- `md:` used consistently for desktop/mobile split
- TrendingList: Mobile card layout + Desktop table layout — `TrendingList.tsx:78-152`
- BottomNav shows only on mobile — `BottomNav.tsx:20`

### Touch Targets Below 44px

| Element | Size | Location |
|---------|------|----------|
| Pagination buttons | 40×40px | `Pagination.tsx:20` |
| LikeDislike buttons | ~36px | `LikeDislike.tsx:60` |
| Heard/Want buttons | ~36px | `ActionButtons.tsx:55` |
| Sign out avatar | 36×36px | `AppHeader.tsx:229` |
| Genre filter chips | ~28px | `DiscoverPage.tsx:257` |

### Safe Area ✅
- `viewport-fit=cover` meta — `__root.tsx:79`
- `.pb-safe` with `env(safe-area-inset-bottom)` — `styles.css:118-120`

### iOS Input Zoom ✅
All form inputs use `text-base` on mobile — no auto-zoom triggered.

### RTL Support ❌
- `lang="en"` hardcoded, no `dir` attribute handling
- No RTL CSS, no bidirectional text consideration

---

## Vital 5: Speed — Watch (5/10)

### Font Loading ✅
- Preconnect to `fonts.bunny.net` — `__root.tsx:97`
- `display=swap` — `__root.tsx:98-99`
- System font fallback chain

### Skeletons ✅
Custom shimmer skeleton across FeedPage, DiaryPage, SongPage, TrendingList, CompatibleUsersList.

### Image Optimization — Missing

| Issue | Evidence |
|-------|----------|
| No `width`/`height` on any `<img>` | CLS risk on every image load |
| No `loading="lazy"` except 1 instance | Album art, avatars load eagerly |
| No `decoding="async"` | Zero instances |
| No `srcset` / `<picture>` | No responsive images |
| No `fetchpriority` hints | Zero instances |

**Evidence:** `CoverArt.tsx:30` — `<img src={url} alt={title} className="h-full w-full object-cover" />` with no intrinsic dimensions. All `EntryCard`, `TrendingList`, `DiaryCard` images follow the same pattern.

---

## Vital 6: Accessibility — Watch (5/10)

### Focus-Visible ✅
- Consistent `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` on all interactive elements
- Auth inputs use `focus-visible:ring-2` — heavier, appropriate
- Never `outline: none` without ring replacement

### Missing Aria-Labels (icon-only buttons)

| Button | Location |
|--------|----------|
| Like (Heart) | `LikeDislike.tsx:58` |
| Dislike (ThumbsDown) | `LikeDislike.tsx:67` |
| Pagination prev | `Pagination.tsx:19` |
| Pagination next | `Pagination.tsx:31` |
| BottomNav icons | `BottomNav.tsx:27` |

### Empty Alt Text — Wrong for Identity Images

Avatars (`alt=""` on user profile images at `AppHeader.tsx:233`, `ReviewList.tsx:93`, `EntryCard.tsx:60`, `CompatibleUsersList.tsx:72,109`) should have descriptive alt text — they convey identity. Album art thumbnails (`EntryCard.tsx:92`, `TrendingList.tsx:84,143`, `DiaryCard.tsx:28`) also need descriptive alt.

### Skipped Heading Level
`DiscoverPage.tsx` uses only `<h3>` — no `<h2>` parent. Heading hierarchy skips from `<h1>` (root) to `<h3>`.

### Reduced Motion ✅
`styles.css:141-148` — `prefers-reduced-motion: reduce` with `0.01ms` durations and `scroll-behavior: auto`.

### Color-Only Active States
- Active nav tabs use color change only — `BottomNav.tsx:31-36`
- Like/Dislike filled state is color-only (Heart vs ThumbsDown shape helps but active fill is indistinguishable for color-blind users)

---

## Prescriptions

| Priority | Issue | Prescription |
|----------|-------|-------------|
| 1 | Body text 14px below 16px baseline | `/design typeset` — bump reading text to `text-base` |
| 2 | Missing aria-labels on icon-only buttons | `/design interaction` — add `aria-label` to Like/Dislike/Pagination |
| 3 | Empty alt text on identity images | `/design interaction` — add descriptive alt to avatars/album art |
| 4 | Images missing CLS-prevention attributes | `/design speed` — add width/height, loading=lazy |
| 5 | Touch targets below 44px | `/design responsive` — increase hit areas |
| 6 | Opacity-reduced text below contrast | `/design recolor` — adjust muted-text opacity |
| 7 | Skipped heading level (DiscoverPage) | `/design typeset` — add `<h2>` |

---

**Bottom line:** The design foundation is strong — authored identity, excellent state handling. The watch scores cluster around three fixable categories: text sizing, image optimization, and accessible names. No structural redesign needed. These are targeted fixes, not reimagination.
