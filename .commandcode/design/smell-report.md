# Design Smell Report — drawnTo

**Date:** 2026-07-09
**Score:** 9/10 — FAINT
**Tells found:** 1

---

## Summary

One genuine AI-design smell detected: pill-shape saturation (`rounded-full` on everything). The rest passes — burnt-rust primary, Outfit + Instrument Serif typography, ListenerWall splash, brand-specific copy.

---

## Heuristics Table

| # | Odor | Detected? | Score |
|---|------|-----------|-------|
| 1 | Tech gradient (blue-violet/indigo-cyan) | No | 1 |
| 2 | Generic tech hue (blue-purple identity) | No | 1 |
| 3 | Feature tile grid (3-column icon+heading+desc) | No | 1 |
| 4 | Accent rail (colored left-border on cards) | No | 1 |
| 5 | Unearned blur (frosted glass without depth) | No | 1 |
| 6 | Icon topper (icon-above-heading filler) | No | 1 |
| 7 | Bounce everywhere (elastic easing on everything) | No | 1 |
| 8 | Default type (system font without reason) | No | 1 |
| 9 | Center stack (everything centered as default) | No | 1 |
| 10 | Domain default trap — generic rounded everything | Yes | 0 |

---

## Finding 1 — Pill-Shape Saturation

**Severity:** HIGH
**Odor:** Domain default trap / Uniform bubbly border-radius
**Count:** 38+ `rounded-full` instances across 15+ component files

| Component | File | Elements |
|-----------|------|----------|
| AppHeader | `AppHeader.tsx:159,167,220,223,229` | Search bar, notification bell, avatar |
| ReviewComposer | `ReviewComposer.tsx:101,110,126,168` | 4 action buttons |
| LikeDislike | `LikeDislike.tsx:61,73` | Like/dislike buttons |
| Pagination | `Pagination.tsx:20,31` | Prev/next buttons |
| ReviewList | `ReviewList.tsx:91,151,157` | Avatars, reply input, send button |
| CoverArt | `CoverArt.tsx:69` | Action button |
| SongHeader | `SongHeader.tsx:35` | Genre tag |
| DiaryCard | `DiaryCard.tsx:48,54,60,66,72` | 5 action badges |
| TrendingList | `TrendingList.tsx:90` | Rank badge |
| DiscoverPage | `DiscoverPage.tsx:261` | Genre filter pill |
| CompatibleUsersList | `CompatibleUsersList.tsx:74,83,111,120` | Avatars, badges |

**Why it smells:** `rounded-full` is the default for every interactive element. No deliberate shape hierarchy — buttons, badges, avatars, inputs, filters, tabs, and toggles all use the same pill shape.

**Prescription:** Shape system: action buttons → `rounded-lg` (8px), inputs → `rounded-md` (6px), badges/chips → `rounded-full` (earned), cards → `rounded-2xl` (earned). Pills reserved for badges and chips only.

**Recommended mode:** `/design deslop` or `/design refine`

---

## What Passed

- **Typography:** Outfit + Instrument Serif + Bebas Neue — intentional, not AI-default
- **Color identity:** Burnt rust primary — not blue-purple-tech gradient
- **Copy:** Brand-specific, zero buzzwords
- **Composition:** No feature grids, no cookie-cutter rhythm, no decorative blobs
- **Emoji:** Zero used as design elements
- **Colored left borders:** None
- **Font stack:** System fonts are fallbacks only

---

**Score: 9/10 — FAINT.** One structural tell. The design identity is real. Fix the roundedness uniformity and the design is fully authored.
