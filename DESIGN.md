# Design System — drawnTo

**Last updated:** 2026-07-09
**Design thesis:** Deliberate and restrained. The interface whispers — color appears only when a human takes an action. Like a well-curated record collection where nothing is out of place.

---

## What this product is

drawnTo is a niche music community. Users log listens, mark songs they want to hear, like/dislike, write reviews, and discover people with compatible taste. It's a record store on a side street, not a billboard on a highway. The design must feel intentional, quiet, and personal — never loud, never accidental, never chasing engagement metrics.

---

## Color System

### Philosophy

Grey is the primary voice. Color is earned through interaction. A user scrolling their feed should see a restrained monochrome surface. Color appears when something happened — you liked a song, someone marked it as heard, the community reviewed it. The interface doesn't compete with the music.

### Base Palette (OKLCH)

```css
/* Background — near-black with violet warmth */
--background: oklch(0.04 0.002 280);
--card: oklch(0.04 0.002 280);

/* Elevated surfaces — stepped monochrome for depth */
--popover: oklch(0.10 0.004 280);
--secondary: oklch(0.10 0.004 280);
--muted: oklch(0.10 0.004 280);
--accent: oklch(0.13 0.003 280);      /* hover states */
--raised: oklch(0.08 0.003 280);       /* slightly above background */

/* Text */
--foreground: oklch(0.90 0.01 90);      /* near-white with violet warmth */
--muted-foreground: oklch(0.58 0.02 85); /* warm grey for secondary text */
```

### Primary — The Quiet Voice

```css
/* Neutral light grey — deliberate, not apologetic */
--primary: oklch(0.85 0 0);              /* buttons, links, active states */
--primary-foreground: oklch(0.08 0 0);   /* near-black text on light grey */
```

The primary grey is pure neutral — no warmth, no coolness. It says "this is interactive" without pushing an emotion. It appears on: primary buttons (Post review, Play preview, Send), active tab indicators, active navigation icons, active sub-tab toggles, form focus rings.

### Action Colors — Earned Through Interaction

These only appear when a user took an action. They are never ambient decoration.

```css
--color-like: oklch(0.58 0.22 20);       /* red — the emotional response */
--color-like-foreground: oklch(0.98 0 0);

--color-heard: oklch(0.55 0.16 150);     /* green — confirmation, completion */
--color-heard-foreground: oklch(0 0 0);

--color-want: oklch(0.55 0.17 290);      /* violet — anticipation, personal */
--color-want-foreground: oklch(0 0 0);

--color-dislike: oklch(0.85 0 0);        /* muted grey — same as primary, deliberately understated */
--color-dislike-foreground: oklch(0.08 0 0);

--color-save: oklch(0.62 0.18 255);      /* blue — the collected, saved item */
--color-save-foreground: oklch(0 0 0);
```

### Supporting Roles

```css
--color-artist: oklch(0.78 0.01 90);     /* warm near-white — artist names, subtle */
--destructive: oklch(0.57 0.20 25);       /* deep red — delete, remove, dangerous actions */
--destructive-foreground: oklch(0.96 0.01 85);
--ring: oklch(0.85 0 0 / 35%);           /* focus rings — 35% opacity primary */
--border: oklch(0.90 0.01 90 / 10%);      /* 10% opacity near-white */
--input: oklch(0.90 0.01 90 / 12%);       /* 12% opacity near-white */
```

### Chart Colors

```css
--chart-1: oklch(0.85 0 0);              /* primary grey */
--chart-2: oklch(0.55 0.16 150);         /* green */
--chart-3: oklch(0.85 0 0);              /* grey */
--chart-4: oklch(0.58 0.22 20);          /* red */
--chart-5: oklch(0.58 0.02 85);          /* warm grey */
```

---

## Typography

### Font Stack

**Primary:** DM Sans (200, 300, 400, 500, 600, 700, 800, 900)
Loaded from Bunny CDN with `display=swap`.

```css
--font-sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-serif: "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono: "DM Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
```

All three CSS variables point to DM Sans. Existing `font-serif` and `font-mono` class usage
continues to render correctly — in DM Sans. Nine weights give the full expressive range that
previously required four different font families. Weight contrast — not font-family switching —
carries hierarchy and register shifts.

### Usage

- **All text** uses DM Sans. No font-family switching.
- **Weight contrast** replaces the old multi-family system:
  - 400 (regular) — body, metadata, secondary labels
  - 500 (medium) — UI labels, button text, navigation
  - 600 (semibold) — section headings, active states, song titles (replaces Instrument Serif "this matters" shift)
  - 700 (bold) — primary headings, emphasized text
  - 800 (extrabold) — splash page headlines, stat callouts
  - 900 (black) — ListenerWall textural anchor (replaces Bebas Neue)
  - 200/300 (light) — editorial moments: taglines, quotes (replaces Instrument Serif italic)
- **Splash page:** DM Sans 800 carries the logo and stat callouts. DM Sans 900 with tight
  tracking replaces the Bebas Neue ListenerWall — dense, confident, textural.
- **No serif, no monospace.** The system no longer loads Instrument Serif, Bebas Neue,
  or JetBrains Mono.

### Principles

- Body text minimum: 16px (`text-base`). `text-sm` (14px) is for metadata only.
- Line-height: 1.5–1.6 for body, 1.25 for headings, 1.1 for micro-copy.
- Tabular figures for any number columns.
- No letterspacing on lowercase text.
- Only Typographic Quotes (curly) in body copy. Ellipsis character (`…`), not three dots.

---

## Shape

### Border Radius — Deliberate Hierarchy

```css
--radius: 0.75rem;                       /* 12px — cards, large containers */
```

| Element | Radius | Why |
|---------|--------|-----|
| Cards, cover art, popovers | `rounded-2xl` (16px) | Generous, confident |
| Action buttons | `rounded-lg` (8px) | Containment without softness |
| Inputs, search bars | `rounded-lg` (8px) | Match button language |
| Badges, chips, genre tags | `rounded-full` | Earned — pills for containment labels only |
| Avatars | `rounded-full` | Circle is correct for identity |

**Pills are reserved for badges and chips.** Buttons, inputs, and tabs use `rounded-lg`. This is intentional: a pill is a container, not a control.

---

## Spacing

### Scale (Tailwind defaults, applied deliberately)

- **Tight:** `gap-1` / `gap-1.5` / `gap-2` — icon-to-label, button pairs, inline metadata
- **Standard:** `gap-3` / `gap-4` — card padding, section spacing, form fields
- **Section:** `gap-6` / `gap-8` — page sections, major layout breaks

### Rhythm

- Content area max-width: `max-w-6xl` (72rem / 1152px)
- Feed max-width: `max-w-2xl` (42rem / 672px) — readable measure
- Song page layout: 320px cover art column + flexible content column

---

## Depth

Three-plane model within the dark surface:

1. **Background** (`--background`): The page canvas. Never interactive.
2. **Content surfaces** (`--raised`, `--card`): Buttons, cards, inputs. Slightly elevated from background.
3. **Attention surfaces** (`--popover`, modals): Dropdowns, tooltips. Highest elevation.

No shadows — the dark background doesn't support them. Depth is conveyed through lightness steps and border contrast.

---

## Motion

### Principles

- Duration: 150–300ms.
- Easing: cubic-bezier everywhere. No bounce. No elastic.
- `transform: scale()` for press feedback (`active:scale-[0.97]` or `active:scale-[0.95]`).
- `prefers-reduced-motion` respected — animations drop to `0.01ms`.
- Animation is functional: reveals state, responds to input, marks transitions. Never decorative.

### Existing Animations

- `animate-scale-in` — 200ms, used for search results and genre dropdown
- `animate-fade-in-up` — 300ms cubic-bezier, used for comment section reveal
- `animate-skeleton` — 1.8s shimmer for loading states
- `active:scale-[0.97]` / `active:scale-[0.95]` — consistent press feedback on all buttons

---

## Interaction

### States

Every interactive element supports: idle, hover, focus-visible, active, disabled, loading.

- **Focus-visible:** `focus-visible:ring-1 focus-visible:ring-ring` on all interactive elements. Never `outline: none` without a ring replacement.
- **Disabled:** `opacity-50 cursor-not-allowed`. No interaction possible.
- **Loading:** `opacity-50` + disabled during async operations. Skeletons for page-level loading.
- **Touch targets:** Minimum 44×44px on all interactive elements.

### Patterns

- **Toggle actions** (Heard, Want, Like, Dislike): Click to activate, click again to deactivate. Mutual exclusion where appropriate.
- **Review flow:** Write -> Collapsed ("See your review") -> Edit or Locked (48h window). Progressive disclosure.
- **Search:** 300ms debounce, Escape to close, click-outside dismiss. Results with thumbnail + title + artist.
- **Navigation:** Three-tab layout (Feed / Diary / Discover). Bottom nav on mobile, header tabs on desktop.

---

## Copy

### Voice

Calm, specific, conversational. No exclamation points. No marketing filler. No "Welcome to..." paragraphs. No instructions that suggest the design failed.

### Patterns

- **Empty states:** What belongs here, why, and how to start. "Your Feed is quiet. Follow friends and artists — their listens and reviews land here."
- **Error messages:** What broke + what to do next. Never blame the user.
- **Button labels:** One verb, specific. "Post review" not "Submit". "Log listen" not "OK".
- **Loading:** Names the work. "Posting…" not "Loading..."

---

## Splash Page Identity

The landing page (`src/routes/index.tsx`) is a brand statement, not a login form.

- **ListenerWall:** 80+ iconic song names in DM Sans 900, repeated 3× in dense justified text. SVG noise texture overlay. Grid lines evoking record sleeve layout. Accent bars top and bottom.
- **Auth panel:** Restrained — dark pill inputs, grey primary submit button, Instrument Serif italic tagline.
- **Philosophy line:** "Music hits different when you share it with the right people." — Instrument Serif italic.

The splash page carries the violet warmth and grey primary. The burnt rust is gone. The accent bars, pulse dot, stat callouts, and logo all use the neutral primary grey.

---

## Component Tokens

### Button

`src/components/ui/button.tsx` — shadcn/ui Button extended with project variants:

- `variant: "default"` — grey primary fill, for primary actions
- `variant: "raised"` — `bg-raised border` for secondary actions
- `variant: "secondary"` — subtle raised, for tertiary/cancel
- `variant: "ghost"` — transparent hover, for navigation
- `shape: "pill"` — `rounded-lg` (project standard for buttons)
- Press feedback baked in: `active:scale-[0.97]`

### Badge

`src/components/ui/badge.tsx` — shadcn/ui Badge extended:

- `variant: "heard" | "like" | "dislike" | "want"` — semantic action colors with 15% opacity backgrounds
- `shape: "pill"` — `rounded-full` for containment labels

### Card

`src/components/ui/card.tsx` — shadcn/ui Card. Use when content is genuinely card-shaped. Extended pattern: `rounded-2xl border bg-raised` for the raised variant used on the song page and review cards.

### Avatar

`src/components/ui/avatar.tsx` — shadcn/ui Avatar with Radix primitives. Handles image/fallback conditional rendering. Should be used for all user identity images.

---

## What We Refuse

- Burnt rust / orange as primary identity (replaced with grey)
- Purple/violet/indigo gradients
- 3-column feature tile grids
- Emoji as design elements
- Decorative blobs, wavy dividers, floating circles
- `rounded-full` on buttons and inputs (reserved for badges/chips/avatars)
- Body text below 16px
- Color-only encoding (all actions have text labels alongside color)
- Placeholder-as-label (labels are always visible)
- "Welcome to...", "Unlock the power of...", or any AI-generated hero copy
