# Design System — #drawnTo

## Product Context
- **What this is:** #drawnTo is a music community platform where people discover, rate, and discuss music. MusicBrainz for data, Genius for cover art.
- **Who it's for:** Music enthusiasts who want honest reviews, real community, and a place where taste lives.
- **Space/industry:** Music discovery and community — like Letterboxd meets RateYourMusic.
- **Project type:** Web app (TanStack Start + Supabase).

## Memorable Thing
Community first, honesty, and connection. Indie feel — the world is chaotic, but finding your people shouldn't be.

## Aesthetic Direction
- **Direction:** Editorial / Indie-Raw — typography-first, warm and analog. Like a well-designed record sleeve.
- **Decoration level:** Intentional — subtle grain textures, warm surfaces.
- **Mood:** Community, honesty, indie warmth. Stepping into a record store at dusk, not logging into an app.
- **Inspiration:** Paula Scher's typographic map paintings (Maps, 1990s–present, Pentagram, New York) — dense, layered information that reads as beautiful chaos, with a single warm point where community converges.

## Typography
- **Brand / Logo:** Outfit Extrabold Italic — closest web font to Allotrop Basic Italic Bold. Geometric, friendly, confident. Used only for the `#drawnTo` wordmark.
- **Tagline / Display:** Instrument Serif — literary warmth, classical and understated. Used for the tagline and display headings that address the user directly.
- **Body / UI:** Outfit Regular + Semibold — all body copy, form labels, input text, buttons, navigation.
- **Data / Tables:** Outfit (tabular-nums available).
- **Code:** JetBrains Mono.
- **Loading:** Bunny Fonts CDN — `https://fonts.bunny.net/css?family=outfit:400,500,600,700,800|instrument-serif:400,400i`

## Color
- **Approach:** Restrained — one accent color plus warm darks and cream light. No cool grays.
- **Primary:** `#D4556A` (Deep Coral) — playful warmth, mature depth. CTA buttons, brand accents, active states.
- **Primary Hover:** `#BF4B5E`
- **Secondary:** `#9D8EC4` (Soft Lavender) — want-to-hear, bookmarks, avatar placeholders. Cool contrast to warm primary.
- **Surface / Card:** `#000000` — pure black.
- **Text Primary:** `#F5F0E8` — warm cream, not terminal white.
- **Text Muted:** `#8A8276` — warm gray.
- **Input Background:** `rgba(245, 240, 232, 0.05)`
- **Input Border:** `rgba(245, 240, 232, 0.12)`
- **Divider:** `rgba(245, 240, 232, 0.08)`
- **Focus Ring:** `rgba(212, 85, 106, 0.35)`
- **Semantic:** Success `#4A9E6E`, Warning `#E8A84A`, Error `#D94A4A`
- **Dark mode only** — the product is dark by default. No light mode needed.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:** 2xs (2px), xs (4px), sm (8px), md (16px), lg (24px), xl (32px), 2xl (48px), 3xl (64px)

## Layout
- **Approach:** Creative-editorial for auth/marketing pages, grid-disciplined for app interior.
- **Max content width:** 1400px.
- **Border radius:** sm (8px), md (12px), lg (16px), full (9999px)

## Motion
- **Approach:** Intentional — subtle fade-ins on mount, gentle hover transitions. No bouncy/spring animations.
- **Easing:** Enter (ease-out), Exit (ease-in), Move (ease-in-out)
- **Duration:** Micro (50–100ms), Short (150–250ms), Medium (250–400ms)

## Auth Page Layout
- **Layout:** Editorial split — Paula Scher-inspired typographic map on a white left panel, auth form on a black right panel.
- **Left panel (white `#FFFFFF`):** Dense layered city names (Bebas Neue), landmass silhouettes, grid lines, circulation routes, stat callouts. A glowing Deep Coral community point. Paula Scher attribution bottom-right.
- **Right panel (black `#000000`):** `#drawnTo` wordmark in Outfit Extrabold Italic, *"music and community"* tagline in Instrument Serif Italic, sign-in/sign-up tab toggle, email + password inputs, primary CTA, Google OAuth button.
- **Philosophy line:** "The world is overwhelming. Finding your people shouldn't be."
- **Mobile:** Single column — mini typographic map header, centered card below with same form layout.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-08 | Initial design system created | Created by /design-consultation based on product context: music community platform, community-first indie feel |
| 2026-07-08 | Primary color: Deep Coral `#D4556A` | Childish warmth meets mature depth — crayon territory but grounded, like a well-worn 70s vinyl sleeve |
| 2026-07-08 | Surface/Card: pure black `#000000` | True black for maximum contrast and minimal distraction |
| 2026-07-08 | Brand font: Outfit Extrabold Italic | Closest web font to Allotrop Basic Italic Bold — geometric, friendly, confident |
| 2026-07-08 | Auth layout: Scher-inspired map + form | White map panel (Scher homage) with black auth panel — the world is chaotic, community is where you find clarity |
