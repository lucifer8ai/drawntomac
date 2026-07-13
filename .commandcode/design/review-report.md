# Design Review — drawnTo

**Date:** 2026-07-09
**Score:** 33/50

---

## Lens Scores

| Lens | Score | Status |
|------|-------|--------|
| 1. First impression | 7/10 | Strong splash, weak interior |
| 2. Hierarchy | 7/10 | Clear on song page, functional in feed |
| 3. Color voice | 6/10 | Analog on splash, over-assigned in app |
| 4. Type voice | 6/10 | Brilliant splash moments, absent inside |
| 5. Interaction feel | 7/10 | Good feedback patterns, missing optimism |

---

## Lens 1: First Impression — 7/10

### What works

The **ListenerWall** on the splash page is a statement piece. 80+ song names in Bebas Neue, repeated 3× in justified text, with SVG noise texture, grid lines, rust accent bars, and a pulsing heartbeat dot. It communicates "this is about music, and there's a lot of it" before the user reads a word. The auth form panel is restrained and confident — dark pill inputs, burnt rust submit button, Instrument Serif tagline. The contrast between the dense Wall and the calm auth panel creates tension that holds attention.

### What doesn't

After login, the app interior becomes a standard dark-mode feed with burnt rust accents. The splash page has 10× more emotional energy than the authenticated experience. The feed is text-dominant song lists. The Discover table is functional but cold. The Diary is badges on entries. Nothing inside the app carries forward the "worn record sleeve" metaphor that the splash page established.

### Prescription

`/design voice` — carry the analog, textural personality into the authenticated app. The splash set a promise the interior doesn't keep.

---

## Lens 2: Hierarchy — 7/10

### What works

The **song detail page** has a clear flow: cover art (320px, rounded-2xl) → song title (Instrument Serif, text-3xl–5xl) → artist (text-artist muted orange) → metadata (release date, country) → genre tags → action buttons (Heard, Want) → Like/Dislike → review composer → reviews section. Progressive disclosure is smart: Like/Dislike only appears after Heard is logged. Want only shows if no Heard and no interactions. The review composer collapses to "See your review" after posting.

### What doesn't

Feed cards are text-dominant — album art is small (56×56px), leaving room for mostly text (song title, artist, review body). The Discover page's desktop table layout is functional but cold: columns of rank/song/heard/like/review counts. It prioritizes data over emotion. Genre filter chips at the top are small (28px height) and hard to scan.

### Prescription

`/design relayout` — give album art more presence in feed cards. Restructure Discover to have more visual energy at the top (a hero section, not just filter chips + table).

---

## Lens 3: Color Voice — 6/10

### What works

**Burnt rust** (`oklch(0.66 0.18 35)`) is a distinctive accent — warm, saturated terracotta that reads as analog and physical. On the splash page it evokes worn record sleeves, aged brick, leather. The dark background (`oklch(0.04 0.002 280)`) has a whisper of violet warmth that makes the rust pop. The action colors are well-scoped: green (Heard), purple (Want), yellow-ochre (Dislike) — each only appears on its specific button and badge.

### What doesn't — the color does too many jobs

The burnt rust is simultaneously: primary button color, active tab underline, active icon fill, notification badge, "like" sentiment color, splash logo color, splash pulse glow, stat callout numbers, play-preview button, genre filter active state, ranking badges, and avatar fallback background. When the same color means "click here (primary action)", "this tab is active (navigation state)", "you liked this (sentiment)", and "someone mentioned you (alert)", it stops meaning anything specific. The color is a utility accent, not a voice.

The "worn record sleeve" metaphor that works on the splash page evaporates inside the app — the rust reads as a generic dark-mode accent (like Tailwind amber on a dark background).

### Prescription

`/design recolor` — separate the jobs. The primary interactive color (buttons, links, active states) should be one hue. Sentiment colors (like, heard, want, dislike) should be distinct. The splash page's rust identity should carry into the app in a way that feels analog and textural, not just "the accent hex."

---

## Lens 4: Type Voice — 6/10

### What works

The **splash page** has the strongest typographic moment in the product: Bebas Neue on the dense song wall (raw, urgent, monospaced-via-justification) contrasted against the delicate Instrument Serif italic tagline ("i don't just listen, i feel it") and philosophy line. This is a real brand-level type decision — it has tension, texture, and register shift.

The song detail page uses Instrument Serif for the song title — the only place the serif appears inside the authenticated app. Outfit at larger sizes (text-2xl for the logo, text-lg for section headings) carries weight and feels intentional.

### What doesn't

Instrument Serif appears in exactly three places: splash tagline, splash philosophy line, and song title. After login, the user never sees serif type again unless they navigate to a song detail page. The serif/sans contrast that gives the splash its personality vanishes.

Outfit at small sizes (text-sm, 14px) reads as a fairly generic geometric sans in dark mode. In Feed cards, Diary cards, and Discover, the type is competent but has no texture — no italic, no serif contrast, just weight variation on a single family.

### Prescription

`/design typeset` — bring Instrument Serif into the app interior. Use it for section headings, entry card titles, or pull quotes in Diary. Let the sans-serif/serif register shift be a recurring design device, not a one-time splash page trick.

---

## Lens 5: Interaction Feel — 7/10

### What works

**Consistent press feedback**: every action button uses `active:scale-[0.97]` or `active:scale-[0.95]` — a subtle, physical press-down that feels tactile. Animation curves are tasteful: `animate-scale-in` (200ms), `animate-fade-in-up` (300ms with custom cubic-bezier). Skeleton loading states use a 1.8s shimmer that replicates real content layout. The search popover has a smooth scale-in entrance and good keyboard support (Escape to close, arrow key navigation).

**State coverage is strong**: every page has loading skeletons, empty states with context, error boundaries, and 404 handling. The progressive disclosure on the song page (actions revealed as you interact) prevents decision overload.

### What doesn't — the "did it register?" gap

Most toggle actions (Heard, Want, Like, Dislike) lack optimistic updates. The user taps, waits for a DB round-trip (200-500ms on good connections, longer on slow), then sees the visual change. On slow connections, the gap creates a "did it work?" moment. The button shows `opacity-50` during loading, which communicates "waiting" but doesn't confirm "worked." The only exception is the ReviewCard like toggle — that one IS optimistic and feels instant.

**Missing success feedback**: When you mark a song as Heard, there's no micro-celebration. The button fills with green and the icon swaps — that's it. No toast, no brief animation beyond the color change, no count update, no "this is now in your diary" affirmation. The same applies to Want and Like.

### Prescription

`/design interaction` — add optimistic updates to Heard/Want/Like/Dislike. Add a subtle success micro-animation (a brief pulse or check-to-circle transition) on toggle. A 200ms keyframe that says "done" costs nothing and removes the wait.

---

## Smell Check

One structural tell: **pill-shape saturation** (38+ `rounded-full` instances across 15+ files). Buttons, inputs, filters, tabs, avatars all use the same pill shape — no deliberate shape hierarchy. This is not a fatal smell (the rest of the design is authored), but it flattens the component language. Fix via `/design deslop` or `/design refine`.

---

## Recommendations (by impact)

| Priority | Issue | Mode |
|----------|-------|------|
| 1 | Primary color does too many jobs — separate semantic roles | `/design recolor` |
| 2 | Instrument Serif absent from app interior — extend serif voice | `/design typeset` |
| 3 | No optimistic updates on toggle actions — the "wait" gap | `/design interaction` |
| 4 | Pill-shape saturation — no shape hierarchy | `/design deslop` or `/design refine` |
| 5 | App interior lacks splash page's analog/textural personality | `/design voice` |
| 6 | Feed cards text-dominant, album art too small | `/design relayout` |

---

**Bottom line**: The splash page is memorable. The app interior is competent but hollow — the design choices that make the splash distinctive (Instrument Serif, burnt rust as a texture not a utility, analog warmth) don't carry through. The single highest-impact change is separating the burnt rust's jobs so it becomes a voice again instead of a generic accent. After that: extend the serif into the app, make toggles feel instant, and vary the shape language.
