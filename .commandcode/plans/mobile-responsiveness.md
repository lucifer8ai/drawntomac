# Mobile Responsiveness Plan

## Problem

The #drawnto app has zero responsive design — exactly one `md:` breakpoint in the entire codebase (on the song page grid). Every component was built desktop-first. On phones, the header overflows, the Discover table is illegible, DiaryCard badges overflow, and there's no mobile navigation pattern. Users on phones get a broken experience.

## Approach

**Responsive-first with Tailwind breakpoints** — mobile styles are the default, desktop overrides with `md:` and `lg:` prefixes. No JS-based `useIsMobile` hook. This is the idiomatic Tailwind approach and avoids SSR hydration issues.

## Decisions Summary

| # | Decision | Approach |
|---|----------|----------|
| D1 | Responsive strategy | Tailwind breakpoints (sm:/md:/lg:), no useIsMobile |
| D2 | Mobile nav | Bottom nav on mobile, header tabs on desktop, CSS toggle |
| D3 | DiscoverPage | Stacked card layout on mobile, table on desktop |
| D4 | AppHeader logo | Collapse to `#d.To` on mobile |
| D5 | DiaryCard badges | flex-wrap |
| D6 | Safe-area | viewport-fit=cover + env(safe-area-inset-bottom) |
| D7 | Mobile search | Icon-only button, expands on focus/tap |
| D8 | Touch targets | 44px minimum on all interactive elements |
| D9 | Inline styles | Migrate to Tailwind only where responsive overrides needed |
| D10 | Dead code | Delete useIsMobile hook |
| D11 | Test approach | Smoke tests for responsive patterns via Vitest + Testing Library |

## Implementation Order

```
Phase 1 — Prerequisites
  1. Delete useIsMobile hook (src/hooks/use-mobile.tsx)
  2. Add viewport-fit=cover to meta viewport (src/routes/__root.tsx)
  3. Add .pb-safe utility + safe-area CSS variables (src/styles.css)
  4. Install @testing-library/react + @testing-library/user-event (verify already present)

Phase 2 — Touch Target Hardening (foundation for new components)
  5. src/components/AppHeader.tsx — bell/avatar: h-9 w-9 → h-11 w-11
  6. src/components/song/ActionButtons.tsx — Heard/Want: px-4 py-2 → px-4 py-3
  7. src/components/song/LikeDislike.tsx — heart/thumbs: px-3 py-2 → px-3 py-3
  8. src/components/song/ReviewComposer.tsx — Post/Save/Cancel: px-5 py-2 → px-5 py-3
  9. src/components/song/ReviewComposer.tsx — See your review / Edit / Collapse buttons: px-4 py-2 → py-3
  10. src/components/song/ReviewList.tsx — comment Send button: px-3 py-1.5 → px-3 py-2.5
  11. src/components/song/ReviewList.tsx — comment input: px-3 py-1.5 → py-2.5
  12. src/components/song/Pagination.tsx — arrows: h-8 w-8 → h-11 w-11
  13. src/components/feed/DiaryCard.tsx — badge pills: py-0.5 → py-1
  14. src/components/feed/DiaryPage.tsx — sub-tab pills: py-1.5 → py-2.5
  15. src/components/feed/DiscoverPage.tsx — table rows: py-2.5 → py-3

Phase 3 — Layout & Navigation
  16. Build BottomNav component (new: src/components/nav/BottomNav.tsx)
     - Fixed bottom bar with Feed/Diary/Discover icons (lucide)
     - Active state: blue-500 fill, inactive: #8A8276 outline
     - pb-safe padding for iPhone home indicator
     - Inline styles for colors migrated to Tailwind
  17. src/routes/_authenticated/route.tsx — wrap Outlet with responsive shell:
     - Desktop: AppHeader + Outlet (existing)
     - Mobile: compact AppHeader + Outlet + BottomNav
     - BottomNav visible: block md:hidden, header tabs visible: hidden md:flex
  18. src/components/AppHeader.tsx — mobile adaptations:
     - Logo: full "#drawnto" on md+, compact "#d.To" on mobile (<md)
     - Search: icon-only button on mobile, full bar on md+. On mobile tap → expand to overlay or in-place input
     - Header tabs: hidden on mobile (md:hidden), shown on desktop
     - Gap: gap-4 → gap-2 on mobile
     - Migrate backgroundColor/borderColor inline styles to className where responsive overrides needed
  19. src/components/feed/DiscoverPage.tsx — mobile card layout:
     - Desktop (md+): existing table layout (unchanged)
     - Mobile (<md): each song as a card with:
       - Left: album art (h-12 w-12) + rank badge
       - Right: song title + artist (stacked)
       - Bottom: stats row (Likes / Heard / Reviews in horizontal `flex gap-4`)
     - Container: max-w-4xl on md+, max-w-full px-2 on mobile
  20. src/components/feed/DiaryCard.tsx — line 58: gap-2 → flex-wrap gap-2

Phase 4 — Tests (smoke tests for responsive patterns)
  21. tests/components/BottomNav.test.tsx — renders tabs, active state, hidden on desktop
  22. tests/components/AppHeader.test.tsx — mobile logo, search expand behavior
  23. tests/components/DiscoverPage.test.tsx — card layout on mobile, table on desktop
  24. tests/components/DiaryCard.test.tsx — badges wrap on narrow container

Phase 5 — Cleanup & Documentation
  25. Create TODOS.md with deferred items (see NOT in scope)
  26. Document responsive testing pattern in CLAUDE.md or ADR
```

## Critical Files

| File | What changes |
|------|-------------|
| `src/routes/__root.tsx` | viewport meta: add `viewport-fit=cover` |
| `src/styles.css` | Add `.pb-safe` utility, safe-area CSS variables |
| `src/routes/_authenticated/route.tsx` | Wrap with responsive shell (AppHeader + BottomNav) |
| `src/components/AppHeader.tsx` | Mobile logo, search, nav toggle, touch targets |
| `src/components/nav/BottomNav.tsx` | **NEW** — fixed bottom navigation bar |
| `src/components/feed/DiscoverPage.tsx` | Mobile card layout, touch targets |
| `src/components/feed/DiaryCard.tsx` | flex-wrap badges, touch targets |
| `src/components/feed/DiaryPage.tsx` | Sub-tab touch targets |
| `src/components/song/ActionButtons.tsx` | Touch targets (Heard/Want) |
| `src/components/song/LikeDislike.tsx` | Touch targets |
| `src/components/song/ReviewComposer.tsx` | Touch targets (Post/Save/Cancel/Edit/See) |
| `src/components/song/ReviewList.tsx` | Touch targets (Send button, comment input) |
| `src/components/song/Pagination.tsx` | Touch targets (chevron buttons) |
| `src/hooks/use-mobile.tsx` | **DELETE** |
| `tests/components/*.test.tsx` | **NEW** — 4 smoke test files |

## NOT in scope

- **E2E/browser-level responsive testing** — smoke tests cover component rendering at viewport widths; visual regression testing deferred until Playwright/Cypress exists
- **RTL layout testing** — text truncation and flex direction different in RTL; deferred until i18n on roadmap
- **Landscape orientation optimization** — width-based breakpoints cover it, no separate pass
- **Tablet-specific layout** — md: breakpoint covers 768px+, no separate iPad pass
- **Full a11y audit** — this is a layout/overflow/touch-target fix, not a comprehensive accessibility audit
- **Responsive images (srcset/sizes)** — flagged but deferred; the image loading inconsistency is a separate performance concern
- **Scroll performance (virtualization)** — DiaryPage renders 200 cards; deferred as it's a data concern, not layout
- **Remaining component audit** — shadcn/ui components not currently in use may need mobile review when activated

## What already exists

- **Viewport meta tag** (`__root.tsx:83`) — `width=device-width, initial-scale=1` present, needs `viewport-fit=cover` added
- **Vitest + Testing Library + jsdom** (`vitest.config.ts`, `tests/setup.ts`) — test infrastructure fully configured
- **Tailwind CSS v4** — all breakpoints available, no config changes needed
- **Song page responsive grid** (`song.$slug.tsx`) — proves the `md:` pattern works in this codebase
- **Auth page split layout** (`index.tsx`) — already uses `md:flex-row`, `md:h-screen`, `md:w-[55%]`
- **`#d.To` compact logo** (`song.$slug.tsx:82`) — can be reused for mobile header
- **5 existing test files** — backend logic only, no component tests yet

## Test Coverage Diagram

```
CODE PATHS
[+] src/components/nav/BottomNav.tsx (NEW)
  ├── [NEW]  Renders Feed/Diary/Discover tabs
  ├── [NEW]  Active tab shows blue-500 fill
  ├── [NEW]  Inactive tabs show #8A8276 outline
  └── [NEW]  pb-safe padding applied

[+] src/components/AppHeader.tsx
  ├── [NEW]  Mobile: logo collapses to '#d.To'
  ├── [NEW]  Mobile: search is icon-only, expands on tap
  ├── [NEW]  Mobile: header tabs hidden (md:hidden)
  ├── [NEW]  Desktop: full logo, full search bar, header tabs visible
  └── [REG]  Existing search behavior unchanged on desktop

[+] src/components/feed/DiscoverPage.tsx
  ├── [NEW]  Mobile (<md): stacked card layout renders
  ├── [NEW]  Mobile: rank, artwork, title, artist, stats in card format
  ├── [NEW]  Desktop (md+): existing table layout unchanged
  └── [REG]  Data fetching and sorting behavior unchanged

[+] src/components/feed/DiaryCard.tsx
  ├── [NEW]  Badges wrap on narrow containers
  ├── [REG]  All 5 badge types render correctly
  └── [REG]  Link to song/$slug still works

TOUCH TARGET REGRESSION CHECKS (12 files)
  [REG] All buttons maintain minimum 44px height after hardening

COVERAGE: 0/15 paths currently tested → target: 15/15
QUALITY: 15 NEW smoke tests  |  GAPS: 0 planned
```

## Failure Modes

| Failure | Test? | Error handling? | User sees? |
|---------|-------|-----------------|------------|
| Bottom nav hidden behind iPhone home indicator | ✅ (safe-area CSS) | ✅ (pb-safe) | Clear — nav has inset padding |
| Search bar crushed to 0px on 320px phone | ✅ (icon-only on mobile) | ✅ (expand-on-tap JS state) | Clear — search icon visible, expands on tap |
| DiscoverPage cards overflow on 320px screen | ✅ (card layout test) | ✅ (flex-wrap, min-w-0) | Clear — cards stack vertically |
| DiaryCard badges overflow on narrow screens | ✅ (flex-wrap test) | ✅ (flex-wrap) | Clear — badges wrap to next row |
| Touch targets too small to tap accurately | ✅ (44px minimum enforced) | N/A (design) | Functional — all buttons >=44px |
| Bottom nav tab state desyncs from header tabs | ✅ (shared state via AppHeader parent) | ✅ (single activeTab source) | Not visible — same state drives both |
| SSR flash on bottom nav | N/A (authenticated route has ssr:false) | ✅ (client-only) | No flash — client-only render |

## TODOS.md Entries

```markdown
### Responsive component audit (remaining)
**What:** Audit all shadcn/ui components in src/components/ui/ and remaining app components for mobile overflow risks.
**Why:** Only the actively used components were fixed. When new shadcn components are integrated, they may have the same desktop-first issues.
**Depends on:** This PR landing.
**Context:** Did a thorough pass on AppHeader, DiscoverPage, DiaryCard, DiaryPage, and all song sub-components. The remaining ~46 shadcn components are unused but should be checked when activated.

### Responsive images (srcset/sizes)
**What:** Add `loading="lazy"` consistently and `srcset`/`sizes` attributes to all `<img>` tags.
**Why:** On mobile with slow connections, images load at full resolution. EntryCard, DiaryCard, DiscoverPage, and CoverArt all use Supabase URLs with no responsive image strategy.
**Depends on:** Nothing — can be done independently.
**Context:** Images are all 56-320px rendered but load at source resolution. Adding `loading="lazy"` is trivial. Adding `srcset` requires knowing the CDN's resizing URL convention.

### DiaryPage scroll performance
**What:** Add windowing/virtualization to DiaryPage (fetches 200 entries, renders all to DOM).
**Why:** 200 DiaryCard components with images, badges, and Link wrappers cause jank on mobile scroll.
**Depends on:** Nothing — can be done independently.
**Context:** TanStack Virtual is the natural choice (same ecosystem). FeedPage (50 entries) and DiscoverPage (50 entries) are tolerable; DiaryPage at 200 is the worst case.
```

## Parallelization

| Step | Modules touched | Depends on |
|------|----------------|------------|
| 1-3 (Prereqs) | routes/__root, styles, hooks/use-mobile | — |
| 4-15 (Touch targets) | components/song/*, components/feed/*, components/AppHeader | — |
| 16-17 (BottomNav + shell) | components/nav/, routes/_authenticated | Phase 1 |
| 18 (AppHeader responsive) | components/AppHeader | Phase 1 (conflicts with touch targets — do sequentially) |
| 19 (DiscoverPage) | components/feed/DiscoverPage | Phase 1 (conflicts with touch targets — do sequentially) |
| 20 (DiaryCard) | components/feed/DiaryCard | Phase 1 (conflicts with touch targets — do sequentially) |
| 21-24 (Tests) | tests/components/ | Phases 2-3 |
| 25-26 (Docs) | root | — |

**Parallel lanes:**
- Lane A: Steps 1-3 → 4-15 → 18 → 19-20 (sequential — shared components/*)
- Lane B: Steps 1-3 → 16-17 (can run in parallel with touch targets if careful about merge order)
- Lane C: Steps 21-24 → 25-26 (after implementation)

**Execution:** A + B can partly overlap (touch targets don't touch BottomNav). Merge B first (new files, no conflict), then A. C runs after both.

## Verification

```bash
# Run tests
npx vitest run

# Visual verification (manual, per breakpoint)
# 320px (iPhone SE): header fits, bottom nav visible, DiscoverPage cards, diary badges wrap
# 375px (iPhone 12/13): same, search icon visible and expandable
# 768px (iPad mini / desktop threshold): header tabs visible, bottom nav hidden, DiscoverPage table
# 1024px+: full desktop layout

# Check no useIsMobile imports remain
grep -r "useIsMobile" src/ --include="*.tsx" --include="*.ts"
# Expected: empty output
```

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 11 issues, 0 critical gaps |

**OUTSIDE VOICE (Claude subagent):** 5 gaps found — safe-area insets, mobile search bar crushing, touch target scope underestimated, DiscoverPage cards underspecified, implementation ordering reordered. All addressed in the plan.

**CROSS-MODEL TENSION:** Outside voice recommended `overflow-x-auto` as simpler DiscoverPage alternative vs. our stacked cards decision. Cards chosen for UX quality — scrolling a table sideways on mobile is worse than a card layout for music browsing.

**VERDICT:** ENG CLEARED — ready to implement.

NO UNRESOLVED DECISIONS
