# Onboarding Flow — Design & Implementation Spec

**Last updated:** 2026-07-26  
**Reviews:** /office-hours → /plan-eng-review → /plan-design-review  
**Status:** CLEARED — ready to implement

---

## Overview

Three-step onboarding flow after signup. Steps 1-2 are mandatory, step 3 (city) is skippable. Users who bail at step 3 can resume later.

**Route:** `/onboarding?step=1|2|3` — nav-free, no AppHeader, no BottomNav. Centered `max-w-md` (448px) container on all viewports.

**Detection:** `profiles.onboarding_completed BOOLEAN DEFAULT false` + `profiles.onboarding_step INTEGER DEFAULT 1`. `_authenticated` beforeLoad checks the flag and redirects to `/onboarding`.

**Artist persistence:** `sessionStorage` for selected artist IDs between steps 1 and 2 (survives refresh, not tab close).

---

## Architecture (from eng review)

### Migration
- `ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false`
- `ALTER TABLE profiles ADD COLUMN onboarding_step INTEGER DEFAULT 1`

### RPC
- `get_onboarding_artists()` — returns artists with `song_count >= 10`, sorted by name

### Auth Guard
- `src/routes/_authenticated/route.tsx` beforeLoad: check `onboarding_completed`, redirect to `/onboarding` if false

### Routes
- `src/routes/_authenticated/onboarding.tsx` — step management via `?step=` query param
- `src/components/onboarding/ArtistSelector.tsx` — checkbox list, max 3
- `src/components/onboarding/SongTagger.tsx` — heard toggles, batch batch check
- `src/components/onboarding/HeardToggle.tsx` — lightweight toggle (no re-fetch)
- `src/components/onboarding/CityStep.tsx` — LocationPicker + Save/Skip

### Tests
- `tests/routes/onboarding-redirect.test.tsx`
- `tests/components/ArtistSelector.test.tsx`
- `tests/components/SongTagger.test.tsx`
- `tests/components/OnboardingCityStep.test.tsx`
- `tests/hooks/useOnboardingState.test.ts`

---

## Design Specifications

### Information Architecture

**Step 1: Artist Selection**
```
┌─────────────────────────────────────────────┐
│  #d.To  (24px DM Sans 800, grey primary)  │
│                                             │
│  ● ○ ○  (step dots: active=primary,        │
│            inactive=border/20%)             │
│                                             │
│  Pick 3 artists you listen to.              │
│  (DM Sans 700, 28px, foreground)            │
│                                             │
│  We'll curate your feed based on your taste.│
│  (16px, muted-foreground)                   │
│                              2 of 3 selected│
│  ┌─────────────────────────────────────────┐│
│  │ ○ Seedhe Maut        24 songs     ☐   ││
│  │ ○ DIVINE             18 songs     ☑   ││
│  │ ○ KR$NA              31 songs     ☑   ││
│  │ ○ AP Dhillon         15 songs     ☐   ││ ← disabled (max 3)
│  └─────────────────────────────────────────┘│
│                                             │
│  [Continue]  ← disabled when < 3 selected   │
└─────────────────────────────────────────────┘
```
- Artist rows: 40px circular avatar + name (DM Sans 500, 15px) + song count (13px muted) + 22px checkbox
- Selected: green border (`oklch(0.55 0.16 150 / 40%)`) + green background tint (`oklch(0.55 0.16 150 / 8%)`)
- Max 3 enforced: checkboxes disable when 3 selected (`opacity-0.3 cursor-not-allowed`)
- Counter: right-aligned above list, 14px
- Full scrollable list of all qualifying artists (~30)
- Continue: `rounded-lg`, `min-h-[44px]`, grey primary fill (`oklch(0.85 0 0)`) when active

**Step 2: Song Heard-Tagging**
```
┌─────────────────────────────────────────────┐
│  #d.To                         ● ● ○      │
│                                             │
│  Which songs have you heard?                │
│  Don't overthink — tap what's familiar.     │
│                                             │
│  ── Seedhe Maut ──                         │
│  ○ Maina              ⏻ Heard              │
│  ○ Nanchaku           ⏻ Heard              │
│  ○ 101                ⏻ Heard              │
│                                             │
│  ── DIVINE ──                              │
│  ○ 3:59 AM           ⏻ Heard               │
│  ○ Mirchi            ⏻ Heard               │
│  ○ Kaam 25           ⏻ Heard               │
│                                             │
│  ── KR$NA ──                               │
│  ○ OG                ⏻ Heard               │
│  ○ No Cap            ⏻ Heard               │
│  ○ Say My Name       ⏻ Heard               │
│                                             │
│  [Continue]                                 │
└─────────────────────────────────────────────┘
```
- Single scrollable page, 3 artists' songs shown, grouped with artist name section dividers
- 3 songs per release group (group by `release_group_mbid`)
- Song rows: title (DM Sans 500, 15px) + HeardToggle (right-aligned)
- Continue: always active (minimum 1 heard song)
- Batch diary check via `useDiaryInteractions` on mount, local-only state per toggle

**Step 3: City (Optional)**
```
┌─────────────────────────────────────────────┐
│  #d.To                         ● ● ●      │
│                                             │
│  Where are you? (optional)                  │
│  Helps us find people near you.             │
│                                             │
│  ┌─ Select country ───────────────────────┐│
│  │  India                           ▼     ││
│  └─────────────────────────────────────────┘│
│                                             │
│  ┌─ Select city ──────────────────────────┐│
│  │  Mumbai                          ▼     ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [Save]    [Skip]                           │
└─────────────────────────────────────────────┘
```
- Reuses `LocationPicker` component
- Save: updates profile, sets `onboarding_completed = true`, redirects
- Skip: sets `onboarding_completed = true` directly, redirects

**Completion Screen**
```
┌─────────────────────────────────────────────┐
│  You're all set.                            │
│  Listening to 3 artists, 12 songs.          │
│                                             │
│  [Discover who shares your taste →]         │
└─────────────────────────────────────────────┘
```
- Brief interstitial, 3-second auto-transition or tap to continue
- Personalized stat from onboarding data
- CTA redirects to `/home`

### Interaction States

| Feature | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Artist list (step 1) | 4 skeleton rows (40px circles + text bars) | "No artists available yet." + Retry button | Toast "Couldn't load artists" + Retry | 3 selected, Continue activates |
| Song list (step 2) | 3 skeleton rows per artist group | "No songs found for [artist]." Skip group | Per-group error state + Retry | Heard toggles functional |
| City picker (step 3) | Country dropdown spinner | No cities = "Country only" option | Toast "Couldn't load locations" + Retry | City saved → complete |
| Heard toggle | N/A (optimistic) | N/A | Toast, revert | Toggle toggles |
| Save profile | Button disabled + spinner | N/A | Toast | Redirect |

### Motion
- Step transitions: 200ms `fade` + `slide-x` (left for back, right for forward)
- Heard toggle: `active:scale-[0.97]`
- Continue button: `scale-[1.02]` on enable, `ease-out 200ms`
- `prefers-reduced-motion`: animations drop to `0.01ms`

### DESIGN.md Token Mapping

| Component | Background | Text | Border | Accent |
|-----------|-----------|------|--------|--------|
| Artist row (idle) | `bg-transparent` | `text-foreground` + `text-muted-foreground` | `border border-border` | — |
| Artist row (selected) | `bg-heard/8` | — | `border-heard/40` | — |
| Artist row (hover) | `bg-white/5` | — | `border-border` | — |
| Checkbox (empty) | `bg-transparent` | — | `border border-border` | — |
| Checkbox (selected) | `bg-heard` | `text-heard-foreground` (✓) | `border-heard` | — |
| Continue (disabled) | `bg-primary/8` | `text-muted-foreground` | `border border-border` | — |
| Continue (active) | `bg-primary` (oklch(0.85 0 0)) | `text-primary-foreground` | — | — |
| Step dot (active) | `bg-primary` | — | — | — |
| Step dot (inactive) | `bg-foreground/20` | — | — | — |
| HeardToggle | Inherits HeardButton | | | |
| LocationPicker | Reuses existing | | | |

### Accessibility
- Touch targets: 44px minimum on all interactive elements
- Keyboard nav: Tab through artists, Space/Enter to toggle, Tab to Continue
- ARIA: artist rows `role=checkbox`, step dots `aria-current="step"`, Continue `aria-disabled` when inactive

---

## Implementation Tasks

- [ ] **T1 (P1)** — Migration: `onboarding_completed` + `onboarding_step` columns on profiles
- [ ] **T2 (P1)** — RPC: `get_onboarding_artists()` — artists with song_count >= 10
- [ ] **T3 (P1)** — Auth guard: update `_authenticated` beforeLoad for onboarding redirect
- [ ] **T4 (P1)** — Onboarding route: `/onboarding?step=` route with step management
- [ ] **T5 (P2)** — ArtistSelector: checkbox list, max 3, sessionStorage, Continue gate
- [ ] **T6 (P2)** — SongTagger + HeardToggle: heard toggles, batch check, local state
- [ ] **T7 (P2)** — CityStep: LocationPicker + Save/Skip
- [ ] **T8 (P2)** — Completion screen: personalized stat + redirect to /home
- [ ] **T9 (P2)** — Tests: 5 test files (redirect, ArtistSelector, SongTagger, CityStep, useOnboardingState)
- [ ] **T10 (P2)** — Fix `useDiaryInteractions` dependency key (JSON.stringify)
- [ ] **T11 (P3)** — TODO: Add "minimum 1 heard song" threshold for step 2 (currently all songs)
