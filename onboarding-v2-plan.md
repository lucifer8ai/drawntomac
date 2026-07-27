# Onboarding v2 — Engineering Plan

**Plan for:** feat/discover-page
**Review type:** Engineering (branch diff)
**Created:** 2026-07-27

---

## Problem Statement

Six changes to the onboarding flow and action colors:

1. Background image on onboarding pages (currently `bg-background`, should use picture asset)
2. New ProfileStep (username + avatar + banner) between SongTagger and CityStep — 3-step becomes 4-step
3. SongTagger step 2 shows ALL songs (not just 3 per release group)
4. Add 4 Indian cities: Noida, Visakhapatnam, North Goa, South Goa
5. Review color: `bg-foreground` → `bg-save` (blue) everywhere
6. Action color assignment: Heard=green, Like=red, Unlike=grey, Want=purple, Review=blue

---

## Architecture

### Current State

```
Step 1: ArtistSelector (pick 3 artists)
Step 2: SongTagger (heard-toggle songs, 3 per release group)
Step 3: CityStep (location picker, optional)
  → CompletionScreen
```

### Target State

```
Step 1: ArtistSelector (pick 3 artists)
Step 2: SongTagger (heard-toggle ALL songs, no truncation)
Step 3: ProfileStep (username + avatar upload + banner upload)
Step 4: CityStep (location picker, optional)
  → CompletionScreen
```

### Component Tree (new)

```
onboarding.tsx (4 step dots, background image)
├─ ArtistSelector (unchanged)
├─ SongTagger (modified: remove song limit)
├─ ProfileStep (NEW)
│   ├─ TextInput (username)
│   ├─ ImageUpload (avatar — reuses useProfile.uploadAvatar)
│   └─ ImageUpload (banner — reuses useProfile.uploadBanner)
└─ CityStep (step number updated)
```

### Data Flow

```
ProfileStep
  ├─ username: local state → profiles.username on save
  ├─ avatar: File → useProfile.uploadAvatar() → /api/upload → supabase.storage('avatars') → URL → profiles.avatar_url
  └─ banner: File → useProfile.uploadBanner() → /api/upload → supabase.storage('banners') → URL → profiles.banner_url

Cities: migration INSERT 4 rows → LocationPicker fetches from locations table → CityStep persists location_id
```

### Existing Infrastructure (reuse, don't build)

| What's needed | Already exists | Location |
|---------------|---------------|----------|
| Avatar upload | `useProfile.uploadAvatar()` | `src/hooks/useProfile.ts:132` |
| Banner upload | `useProfile.uploadBanner()` | `src/hooks/useProfile.ts:128` |
| Upload API | `/api/upload` route | `src/routes/api/upload.ts` |
| Storage buckets | `avatars`, `banners` (5MB, images only) | `scripts/setup-storage.ts` |
| Username column | `profiles.username TEXT` | `supabase/migrations/20260710000100_profile_fields.sql` |
| Avatar column | `profiles.avatar_url TEXT` | Existing schema |
| Banner column | `profiles.banner_url TEXT` | Existing schema |
| LocationPicker | Reusable component | `src/components/profile/LocationPicker.tsx` |
| City seed data | Locations table with Indian cities | `supabase/migrations/20260710000100_profile_fields.sql` |

### Files Changed

| File | Change |
|------|--------|
| `src/routes/_authenticated/onboarding.tsx` | 3→4 step dots, background image, ProfileStep slot, renumber CityStep |
| `src/components/onboarding/ProfileStep.tsx` | **NEW** — username + avatar + banner |
| `src/components/onboarding/SongTagger.tsx` | Remove `selectedSongs.length = Math.min(...)` limit |
| `src/components/feed/TypeDot.tsx` | `review: "bg-foreground"` → `review: "bg-save"` |
| `src/components/feed/CompatibleUsersList.tsx` | `bg-[var(--color-want)]` → `bg-[var(--color-save)]` for reviewed bar |
| `supabase/migrations/20260727_add_indian_cities.sql` | **NEW** — INSERT 4 cities |
| `src/components/onboarding/CityStep.tsx` | Heading text updated for step 4 context |
| `docs/onboarding-design-spec.md` | Update spec for 4-step flow |

### NOT changed

- `src/styles.css` — color tokens already correct (`--color-save` is blue, `oklch(0.62 0.18 255)`)
- `src/components/song/ActionButtons.tsx` — already uses `bg-heard`, `bg-want` correctly
- `src/components/song/ReviewComposer.tsx` — already uses `bg-save`
- `src/components/profile/ProfileTasteCard.tsx` — already maps `review` → `bg-save`

---

## Code Quality

### Background Image

Use the picture at `picture/Untitled - 11 July 2026 at 08.54.03.png` as a CSS background on the onboarding container. Best approach:

```tsx
// onboarding.tsx — the outer container
<div
  className="min-h-screen flex flex-col items-center justify-start px-4 pt-12 pb-8 relative"
  style={{
    backgroundImage: `url('/pictures/onboarding-bg.png')`, // copy to public/
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  {/* Dark overlay for readability */}
  <div className="absolute inset-0 bg-background/85 z-0" />
  <div className="w-full max-w-md space-y-8 relative z-10">
    {/* existing content */}
  </div>
</div>
```

Copy the picture to `public/pictures/onboarding-bg.png` so it's served by the static server. The `bg-background/85` overlay preserves text readability while showing the image texture underneath.

### ProfileStep Design

Reuse `useProfile` hook for uploads — no new API endpoint, no new Supabase client. The `ProfileEditForm` component (`src/components/profile/ProfileEditForm.tsx`) already implements the exact same UX (username field + avatar upload + banner upload). The ProfileStep should follow its patterns:

- Username: controlled `<input>` with real-time validation (3-30 chars, alphanumeric + underscores)
- Avatar: clickable 96px circle showing current image or initials, triggers `<input type="file">`
- Banner: clickable 240x80px rectangle, triggers `<input type="file">`
- Upload progress: `useState<boolean>` per field, spinner overlay during upload
- Error handling: toast on failure, retry button

Unlike ProfileEditForm, ProfileStep saves ALL fields at once (username + uploaded URLs) in a single `profiles.update()` call when the user clicks Continue. This avoids partial state.

### SongTagger — Remove 3-per-release-group Limit

Current code in `SongTagger.tsx:92-93`:

```ts
selectedSongs.push(...releaseSongs.slice(0, 3));
if (selectedSongs.length >= 3) break;
```

Change to:

```ts
selectedSongs.push(...releaseSongs);
// Remove: if (selectedSongs.length >= 3) break;
```

And remove `selectedSongs.length = Math.min(selectedSongs.length, 3)`. The "Continue" button threshold changes from `mergedHeard().size >= 1` — this stays the same (need at least 1 heard song to continue).

### Review Color Fix — TypeDot.tsx

`TypeDot.tsx:18` currently maps `review → "bg-foreground"` (neutral grey). It should be `review → "bg-save"` (blue). The `bg-save` token resolves to `oklch(0.62 0.18 255)` — a rich blue.

### Review Color Fix — CompatibleUsersList.tsx

`CompatibleUsersList.tsx:133` uses `bg-[var(--color-want)]` (purple) for the reviewed percentage bar. Should be `bg-[var(--color-save)]` (blue). This is a copy-paste bug.

### City Migration

New migration file, uses `INSERT ... ON CONFLICT DO NOTHING` (idempotent):

```sql
INSERT INTO public.locations (country, city) VALUES
  ('India', 'Noida'),
  ('India', 'Visakhapatnam'),
  ('India', 'North Goa'),
  ('India', 'South Goa')
ON CONFLICT DO NOTHING;
```

The unique index `idx_locations_country_city_unique` on `(country, COALESCE(city, ''))` handles dedup.

### Action Color Assignment Verification

| Action | Token | Color | Status |
|--------|-------|-------|--------|
| Heard | `--color-heard` | `oklch(0.55 0.16 150)` green | ✅ Already correct |
| Like | `--color-like` | `oklch(0.58 0.22 20)` red | ✅ Already correct |
| Unlike/Dislike | `--color-dislike` | `oklch(0.85 0 0)` grey | ✅ Already correct |
| Want to hear | `--color-want` | `oklch(0.55 0.17 290)` purple | ✅ Already correct |
| Review | `--color-save` | `oklch(0.62 0.18 255)` blue | ⚠️ Fix TypeDot + CompatibleUsersList |

The token names already match the requested semantics. `--color-save` maps to blue, and it's consistently used as the review color. Only two bugs need fixing.

---

## Design Specification

All design decisions must align with DESIGN.md (Vinyl Static system). No shadows, depth through lightness steps, color earned through action, DM Sans only, rounded-lg for controls, rounded-2xl for cards, rounded-full for avatars/badges.

### Background Image Treatment

The picture `picture/Untitled - 11 July 2026 at 08.54.03.png` is served from `public/pictures/onboarding-bg.png` as a CSS `background-image` on the onboarding container. Applies to ALL onboarding steps (1-4) and the completion screen.

**Layering model (z-stack, bottom to top):**
1. Background image: `cover`, `center`
2. Overlay: `bg-background/85` (oklch(0.04 0.002 280) at 85%) — darkens image for text readability
3. Content container: `relative z-10`, `max-w-md`, `w-full`, `space-y-8`

The overlay opacity balances two goals: the image texture must be perceptible (not a solid black screen), and body text at 16px DM Sans on `--foreground` must pass WCAG AA contrast (4.5:1 minimum). At 85% opacity, `--foreground` (oklch(0.90 0.01 90)) against the image+overlay composite should achieve this. If it doesn't, increase to `bg-background/90`.

The same noise texture approach from the landing page's ListenerWall should NOT be applied — the background image IS the texture.

### ProfileStep — Visual Hierarchy (Pass 1: IA)

Scan order (top to bottom, as user scrolls):

1. **Step dots** (header row) — orientation: "I'm on step 3 of 4"
2. **Banner upload area** — largest visual element, first thing that communicates "this is a profile setup"
3. **Avatar + label** — identity anchor, left-aligned circle
4. **Username input** — the primary interaction, below avatar
5. **Continue button** — the action goal
6. **Skip link** — escape hatch, de-emphasized

This follows the natural F-pattern scan for mobile forms. Banner at top establishes context ("this is about you"). Avatar centers identity. Username is the only required text input. Button at bottom follows standard mobile form convention.

### ProfileStep — Token Mapping

| Element | Background | Text | Border | Size |
|---------|-----------|------|--------|------|
| Banner area (empty) | `bg-raised` | `text-muted-foreground` | `border border-border` | 320×120px, `rounded-lg` |
| Banner area (with image) | `<img>` fill | — | `border-border` | 320×120px, `rounded-lg` |
| Avatar (empty) | `bg-white/5` | — | — | 96×96px, `rounded-full` |
| Avatar (with image) | `<img>` fill | — | `ring-2 ring-border` | 96×96px, `rounded-full` |
| Avatar label | — | 14px DM Sans 500 `text-muted-foreground` | — | — |
| Username label | — | 14px DM Sans 500 `text-muted-foreground` | — | — |
| Username input | `bg-raised` | `text-foreground` 16px | `border border-border` | `min-h-[44px]`, `rounded-lg`, `px-4` |
| Username hint | — | 13px `text-muted-foreground` | — | — |
| Username error | — | 13px `text-destructive` | `border-destructive` (on input) | — |
| Continue (active) | `bg-primary` (oklch 0.85 0 0) | `text-primary-foreground` | — | `min-h-[44px]`, `rounded-lg` |
| Continue (disabled) | `bg-primary/8` | `text-muted-foreground` | `border border-border` | `min-h-[44px]`, `rounded-lg` |
| Skip | `bg-transparent` | 14px `text-muted-foreground`, underline on hover | — | `min-h-[44px]` |

### ProfileStep — Interaction States

| State | Banner | Avatar | Username | Continue |
|-------|--------|--------|----------|----------|
| **Idle** | Dashed border camera icon + "Add banner" | bg-white/5 camera icon + "Profile picture" label | Empty input, placeholder "Choose a username" | Disabled (empty username) |
| **Typing username** | Same | Same | Text visible, hint below | Enabled when ≥3 chars valid |
| **Uploading avatar** | Same | Spinner overlay on circle, toast "Uploading…" | Retains value | Disabled during upload |
| **Uploading banner** | Spinner overlay, toast "Uploading…" | Retains image | Retains value | Disabled during upload |
| **Both uploading** | Spinner overlay | Spinner overlay | Retains value | Disabled |
| **Upload error** | Error banner state + toast | Error icon + toast | Retains value | Re-enabled |
| **All set** | Image displayed | Image displayed | Valid username | Active, `scale-[1.02]` |
| **Username error** | Same | Same | Red border, error message below | Disabled |
| **Username taken** | Same | Same | Red border, "Username taken" below | Disabled |

### ProfileStep — Copy

- Heading: "Set up your profile" — DM Sans 700, 28px, `text-foreground`
- Subtitle: "This is how others will see you." — DM Sans 400, 16px, `text-muted-foreground`
- Banner empty state: "Add banner" — DM Sans 400, 14px, `text-muted-foreground` with Lucide `Image` icon (16px)
- Avatar label: "Profile picture" — DM Sans 500, 14px, `text-muted-foreground`
- Avatar empty icon: Lucide `Camera` (20px, `text-muted-foreground/40`)
- Username label: "Username" — DM Sans 500, 14px, `text-muted-foreground`
- Username placeholder: "Choose a username" — italic
- Username hint: "3-30 characters, letters, numbers, and underscores" — 13px, `text-muted-foreground`
- Username error: "{message}" — 13px, `text-destructive`
- Continue button: "Continue" — DM Sans 600, 14px
- Skip link: "Skip for now" — DM Sans 400, 14px, `text-muted-foreground`
- No exclamation points per DESIGN.md copy rules
- No "Welcome to..." copy per DESIGN.md Refuse list

### Step Dots — 4-Step Update

The step dots array changes from `[1, 2, 3]` to `[1, 2, 3, 4]`. Visual behavior unchanged:
- Active dot: `bg-foreground` (solid white)
- Inactive dot: `bg-foreground/20` (dimmed)
- Dot size: `w-2.5 h-2.5` (10px)
- Gap: `gap-2` (8px)
- Container: `flex items-center gap-2` to the right of the #d.To logo
- Transition: `transition-colors` on each dot

### Step Transitions — Motion

Per DESIGN.md motion principles and the existing design spec:
- Forward (step 1→2, 2→3, 3→4): 200ms `fade` + `slide-x` (slide right)
- Back (step 4→3, etc.): 200ms `fade` + `slide-x` (slide left, reverse direction)
- `prefers-reduced-motion`: animations drop to `0.01ms`
- Step content wraps in an animated container using existing `animate-fade-in-up` or `animate-scale-in` classes, or a custom `slide-right-enter` animation

### SongTagger — No Truncation Visual Impact

Removing the 3-per-release-group limit means each artist can show more than 3 songs. The visible change:
- Group header (artist name, uppercase 14px DM Sans 600 `text-muted-foreground`) stays
- Song rows continue past 3 — the scrollable container (`max-h-[420px] overflow-y-auto`) handles overflow
- Continue button stays at the bottom, always visible (not scrolled away)
- If an artist has 5 release groups, 15 songs could appear — the design spec's skeleton loading should use more skeleton rows in step 2 (currently 3 per artist group, should match actual song count)

### CityStep — Step Number Update

Heading changes from implicit step-3 context to explicit step-4 context. No visual redesign needed. Copy remains:
- Heading: "Where are you? (optional)" — unchanged
- Subtitle: "Helps us find people near you." — unchanged

---

## Responsive Behavior

The onboarding flow is designed mobile-first. The `max-w-md` (448px) container centers content on all viewports — no desktop-specific layout changes needed.

### Breakpoint inventory

| Viewport | Banner | Avatar | Username input | Step dots | Content width |
|----------|--------|--------|---------------|-----------|---------------|
| < 390px (narrow mobile) | 280×105px | 80×80px | Full width | Same (10px dots) | `px-4` padding, content fills |
| 390-448px (standard mobile) | 320×120px | 96×96px | Full width | Same | `max-w-md` centered |
| > 448px (tablet/desktop) | 320×120px | 96×96px | Full width | Same | `max-w-md` centered, generous vertical space |

The background image uses `background-size: cover` on all viewports. On narrow mobile, the banner shrinks proportionally but maintains aspect ratio. The avatar stays locked at 96px — it's an identity element, not a layout element.

The song tagger step (step 2) with more songs gets a taller scroll container on desktop: `max-h-[420px]` on mobile, `max-h-[600px]` on screens above 768px. This prevents a cramped 3-row viewport on desktop.

No horizontal scroll at any breakpoint. All content fits within `max-w-md`.

## AI Slop Prevention

DESIGN.md's "What We Refuse" list prevents the common AI-generated patterns. Here's what this plan specifically avoids and where it could slip:

| Pattern | Status | Guard |
|---------|--------|-------|
| Generic card grid | ✅ Not present | Onboarding is a linear wizard, not a card feed |
| "Welcome to..." copy | ✅ Not present | All headings are action-oriented |
| Decorative blobs/waves | ✅ Not present | Background is a real photo, not generated decoration |
| 3-column feature layout | ✅ Not present | Single-column, form-focused |
| `rounded-full` on buttons | ✅ Enforced | All buttons use `rounded-lg`, avatars use `rounded-full` |
| Emoji as icons | ✅ Use Lucide | Already using Lucide icons project-wide |
| Gradient overlays | ⚠️ Risk | Background image overlay is a solid `bg-background/85` — NOT a gradient or blend mode |
| Placeholder-as-label | ✅ Guarded | Username field has a visible `<label>` above + a placeholder inside |
| Color-only encoding | ✅ Guarded | All action buttons have text labels (Heard, Like, etc.) alongside color |

**Risk identified:** The banner upload area's empty state ("Add banner" + camera icon) risks looking like a generic placeholder pattern. Fix: add a subtle dashed border treatment (`border-dashed border-border`) to distinguish it from the solid-border inputs. Already specified in the token mapping.

## Accessibility

Touch targets: 44px minimum on ALL interactive elements. Verified:
- Username input: `min-h-[44px]` ✅
- Continue button: `min-h-[44px]` ✅
- Skip link: `min-h-[44px]` ✅
- Banner upload area: 120px tall ✅ (well above 44px)
- Avatar upload: 96px circle ✅ (well above 44px)
- Step dots: 10px ❌ — NOT interactive, visual-only. Acceptable.

Keyboard navigation:
- Tab order: avatar upload → banner upload → username → Continue → Skip
- Upload triggers: `<input type="file" hidden>` triggered by the visible clickable area, keyboard accessible via Tab+Enter
- Username: standard text input, tabbable
- ARIA: upload areas labeled with `aria-label="Upload profile picture"` / `aria-label="Upload banner"`
- Continue button: `aria-disabled` when inactive
- Step dots: `role="tab"`, `aria-current="step"` (already implemented)

Screen reader announcements:
- Upload success: toast with `role="alert"` (Sonner handles this)
- Upload error: toast with error message
- Username validation error: inline `<p role="alert">` below the input
- Step change: page title + step dots announce current position

Contrast: All foreground text (`oklch(0.90 0.01 90)`) against the `bg-background/85` overlay + photo composite should achieve > 4.5:1 for body text and > 3:1 for large text (28px heading). If testing reveals contrast failure, increase overlay opacity to `bg-background/90`.

Reduced motion: All step transitions and button press animations respect `prefers-reduced-motion: reduce` — animations drop to `0.01ms`. Already in the design spec, carried forward.

---

## Tests

### New Test: ProfileStep

`tests/components/OnboardingProfileStep.test.tsx`

```
- Renders username input with placeholder
- Username validation: shows error for < 3 chars, > 30 chars, special chars
- Uploads avatar via useProfile.uploadAvatar
- Uploads banner via useProfile.uploadBanner
- Shows loading state during uploads
- "Continue" disabled while uploading
- "Continue" calls onComplete with username + URLs
- Error state: shows toast on upload failure
```

### Updated Test: onboarding redirects

`tests/routes/onboarding-redirect.test.tsx`

```
- 4 step dots render (was 3)
```

### Updated Test: CityStep

`tests/components/OnboardingCityStep.test.tsx`

```
- No structural changes, just verify still works
```

### Updated Test: TypeDot

`tests/components/TypeDot.test.tsx`

```
- Review dot now has bg-save class (not bg-foreground)
```

### Updated Test: SongTagger

`tests/components/SongTagger.test.tsx` (if it exists, or create)

```
- All songs shown per artist (no 3-song truncation)
```

---

## Performance

### Upload Parallelization

The `ProfileStep` should upload avatar and banner in parallel (`Promise.all`), not sequentially. Both are independent. Current `useProfile.uploadAvatar` and `uploadBanner` each make their own `/api/upload` call — calling them in parallel cuts upload wait time in half for users changing both.

### Step Transitions

Adding a 4th step adds one more navigation event. Each step transition is a `navigate({ to: '/onboarding', search: { step: N } })` — client-side route change, near-instant. No performance concern.

### SongTagger Load

Removing the 3-song truncation increases data volume per artist. Max songs per artist in the DB varies, but even 100+ songs per artist is fine — the component fetches in one query, groups by release, and renders rows. No pagination needed; the step 2 scroll height already handles overflow.

### Background Image

The picture asset is ~3MB based on typical PNG exports. Consider:
1. Compress to WebP (~300KB) and serve as `onboarding-bg.webp`
2. Add `loading="lazy"` not applicable (CSS background), but browser handles decode naturally
3. Add `<link rel="preload" as="image" href="/pictures/onboarding-bg.webp">` in index.html for faster first paint

---

## Migration Strategy

1. **Color fixes first** — TypeDot + CompatibleUsersList (2 lines, zero risk)
2. **City migration** — INSERT 4 rows (zero risk, idempotent)
3. **SongTagger truncation removal** — simple deletion
4. **Background image** — copy asset to `public/`, add background style
5. **ProfileStep** — new component, most complex piece
6. **4-step wiring** — update onboarding.tsx dots + step routing
7. **Update design spec**
8. **Tests**

Order matters: color fixes and city migration can deploy independently. The 4-step rework (ProfileStep + step dots) should go together.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User uploads avatar but not banner (or vice versa) | Save what they uploaded, leave the other field null |
| Username already taken | Check uniqueness via Supabase `.maybeSingle()` before save, show inline "Username taken" error below the input with `text-destructive` color and `border-destructive` on input |
| Username passes client validation but fails server-side | Server returns error, same inline error treatment as taken username. Client validation is optimistic — server is authoritative |
| Upload fails mid-save (network drop) | Toast error, keep Continue enabled for retry, don't clear file state or uploaded previews |
| User navigates back from step 3 to step 2 | ProfileStep state (username + uploaded images) NOT persisted. User re-enters on return. This is intentional — onboarding is one-directional, and users shouldn't lose work they didn't explicitly save |
| User goes step 3→4→back to 3 | ProfileStep resets to empty. Step 3 doesn't persist until Continue is clicked. If user wants to change profile after step 4, they can do it from settings |
| Picture file missing from public/ | Falls back to `bg-background` — no white screen. CSS `background-image` with a fallback: `style={{ backgroundImage: url(...) }}` with no fallback URL, so missing image = transparent = `bg-background` shows through |
| Migration runs twice | `ON CONFLICT DO NOTHING` prevents duplicates |
| User skips step 4 (city) after step 3 (profile) | Profile changes already saved in step 3's Continue handler, skip just sets `onboarding_completed` |
| Very long username (30 chars) | Input `maxLength={30}`, no visual overflow — input scrolls internally. Container has `overflow-hidden` |
| User clicks Continue rapidly twice | Button disables (`disabled` prop + `opacity-50`) during the save operation to prevent double-submit |
| Avatar/banner file > 5MB | Storage bucket rejects it. Toast "File too large. Max 5MB." The `<input accept="image/*">` should also validate file size client-side before upload |

---

## Implementation Order

1. Create `supabase/migrations/20260727_add_indian_cities.sql`
2. Fix `src/components/feed/TypeDot.tsx` line 18
3. Fix `src/components/feed/CompatibleUsersList.tsx` line 133
4. Remove truncation in `src/components/onboarding/SongTagger.tsx`
5. Create `public/pictures/onboarding-bg.png` (copy + compress from `picture/`)
6. Create `src/components/onboarding/ProfileStep.tsx`
7. Update `src/routes/_authenticated/onboarding.tsx` (4 steps + background)
8. Update `src/components/onboarding/CityStep.tsx` heading text
9. Write tests
10. Update `docs/onboarding-design-spec.md`

---

## GSTACK REVIEW REPORT

### Engineering Review

| Run | Status | Findings |
|------|--------|----------|
| Architecture | ✅ | 4-step flow; reuse existing upload infra, no new API needed |
| Code Quality | ✅ | 2 pre-existing bugs found (TypeDot, CompatibleUsersList); rest is greenfield ProfileStep |
| Tests | ✅ | 1 new test file + updates to 3 existing files |
| Performance | ✅ | Parallel uploads; no new DB queries; bg image needs WebP compression |

### Design Review (7-Pass)

| Pass | Initial | Final | Key gap(s) fixed |
|------|---------|-------|-------------------|
| 1. Information Architecture | 3/10 | 9/10 | Added visual scan order for ProfileStep: banner → avatar → username → button → skip |
| 2. Interaction States | 5/10 | 9/10 | Added complete state table (9 states) + 5 new edge cases |
| 3. Visual Hierarchy (tokens) | 4/10 | 10/10 | Full token mapping table: 12 elements, 4 columns each |
| 4. Copy & Voice | 6/10 | 10/10 | All copy specified with font/weight/size; no DESIGN.md violations |
| 5. Responsive Behavior | 2/10 | 9/10 | Added 3-viewport breakpoint inventory; song-tagger desktop height adjustment |
| 6. AI Slop Risk | 7/10 | 9/10 | 1 risk identified (banner empty state); mitigated with dashed border spec |
| 7. Accessibility | 4/10 | 9/10 | Tab order, ARIA labels, screen reader announcements, contrast, reduced motion |

**DESIGN.md compliance:** All color tokens, typography, shape hierarchy, depth model, motion, copy voice, and refusal rules verified against DESIGN.md v2026-07-09. No violations.

**Mockup generation:** Failed — no OpenAI API key configured for gstack designer. Run `$D setup` to enable visual mockups. Proceeding with text-specified design backed by DESIGN.md.

### Cross-Cutting Concerns

**ProfileStep non-persistence on back-nav:** Users navigating back from step 3 lose their profile inputs. This is deliberate — onboarding is one-directional, and the profile can be edited from settings later. The profile isn't saved until Continue is clicked in step 3. If this feels too aggressive, the fallback is to persist `username + uploaded URLs` in `sessionStorage` (the same pattern used for artist selection in step 1→2).

**SongTagger skeleton mismatch:** When the 3-song truncation is removed, the loading skeleton in step 2 shows 3 skeleton rows per artist group. For artists with 15+ songs, this under-represents. Fix: the skeleton should match the actual number of songs per artist. This is a pre-existing issue in the current code, but removing the limit makes it more noticeable.

**VERDICT:** CLEARED — ready to implement. No blocking design issues. Two pre-existing code bugs surfaced. The ProfileStep spec is now complete with visual hierarchy, token mapping, interaction states, responsive behavior, accessibility, and edge cases.

NO UNRESOLVED DECISIONS
