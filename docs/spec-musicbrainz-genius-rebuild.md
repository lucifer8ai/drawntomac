# Spec: Genius + MusicBrainz Integration & App Core Rebuild

**Labels:** feature, breaking
**Author:** /spec
**Date:** 2026-07-08
**Build order:** Schema + API clients → Song page → Discovery → Feed → Diary

---

## Goal

Replace iTunes with Genius (artwork) and MusicBrainz (metadata). Rebuild the app core: feed, diary, discover, song pages.

iTunes API is unreliable and lacks the metadata richness (credits, genre tags, multi-artist tracks) that #drawnto needs. iTunes was a placeholder.

---

## Data Architecture

### diary_entries — all user-song interactions

One row per interaction: `(user_id, song_id, type, rating?, body?, listened_on?)`

One review per song per user. Editable for 48 hours, then locked. UNIQUE constraint on (user_id, song_id) for type='review'.

- review_likes → references `diary_entries.id` where type='review'
- review_comments → references `diary_entries.id` where type='review'

**Separate domains:** user data (profiles), social (follows/blocks/DMs/notifications), song data (from API, cached in DB) — all kept in their own tables, unchanged from current social schema.

---

## Target Schema

### artists (drop and recreate)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | |
| slug | text UNIQUE NOT NULL | |
| musicbrainz_id | text UNIQUE | MusicBrainz artist MBID |
| genius_artist_id | text | Genius artist page ID |
| image_url | text | From Genius |
| created_at | timestamptz | |

### songs (drop and recreate)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| title | text NOT NULL | |
| slug | text UNIQUE NOT NULL | |
| artist_id | uuid FK → artists | |
| musicbrainz_id | text UNIQUE | Recording MBID |
| genius_song_id | text | Genius song/URL ID |
| genius_thumbnail_url | text | Cover art from Genius |
| preview_url | text | Preview audio |
| genre_tags | text[] | From MusicBrainz tags |
| credits | jsonb | Producers, writers, performers |
| release_group_mbid | text | Groups releases together |
| country | text | Release country |
| release_date | date | |
| created_at | timestamptz | |

### diary_entries (new)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| song_id | uuid FK → songs | |
| type | text CHECK (heard,want,rating,review) | |
| listened_on | date | Only for type=heard |
| rating | numeric(2,1) CHECK (≥1.0 ≤5.0) | For heard/rating (whole or half stars) |
| body | text | Comment text for heard/review |
| created_at | timestamptz | |

Unique constraint on (user_id, song_id) for types: heard, want, rating, review.

### Dropped tables

- `library_entries`
- `listens`
- `reviews`
- `spotify_token_cache`

### Unchanged tables

profiles, follows, blocks, dm_threads, dm_messages, notifications (with triggers)

---

## What Stays

- All social tables (profiles, follows, blocks, dm_threads, dm_messages, notifications — with triggers)
- Auth system: email + Google OAuth (unchanged)
- Auth landing page (index.tsx — Paula Scher collage, Apple button removed)
- DESIGN.md design system
- shadcn/ui component library
- TanStack Start + Supabase stack

## What's Removed

- **Apple OAuth** — button removed from auth page
- `itunes.functions.ts`
- `routes/api/itunes/search.ts`
- `routes/api/itunes/new-releases.ts`
- `routes/api/itunes/import.ts`
- `home.tsx` — replaced with new tabbed home page

---

## Data Pipeline

**Just-in-time:** user searches MusicBrainz → song not in DB → fetch MusicBrainz metadata + Genius art → store in DB → return to client.

**Cached-first:** once stored, served from database. No re-fetch from external APIs unless explicitly triggered.

**Failure mode:** API down → toast error notification. Previously cached songs continue to work. No exponential retry loop — user retries manually.

**Genre tags:** auto-tagged from MusicBrainz tag data. Manual override via an admin override column on songs (or separate override table).

---

## Features (in build order)

### 1. Song Page (`/song/$slug`)

- Full metadata display: credits, release info, genre tags, country
- Genius thumbnail (cover art)
- **Heard** button → creates diary entry (type=heard, listened_on=today)
- **Want to hear** button → creates diary entry (type=want)
- **Rating** widget: star selector, 1-5 stars, half-star increments → diary entry (type=rating)
- **Review** form: text area + submit → diary entry (type=review)
  - Editable for 48 hours from creation, then locked
  - Each user gets one review per song
- Average rating display: aggregated from all diary_entries where type IN ('heard', 'rating') and rating IS NOT NULL
- Others' reviews feed: paginated list of diary_entries where type='review', with like + comment interactions

### 2. Discovery Tab (`/home?tab=discover`)

- **New releases** section: genre-filtered tabs (indie, pop, rap)
  - Sourced from MusicBrainz new releases browser
  - Auto-tagged from MusicBrainz genre data
  - Manual override capability
  - Each card: Genius thumbnail, artist name, song title, release date
  - Click → navigates to song page

- **People you might know** section: strangers ranked by Jaccard similarity
  - Score = shared interactions / total unique songs both users interacted with
  - Query: calculate Jaccard against all users not followed by current user
  - User cards: avatar, username, display name, compatibility %, shared song count
  - Future: recommendation engine (ML) — Jaccard is the MVP

### 3. Feed Tab (`/home?tab=feed`)

- Activity feed from people the user **follows** (no strangers)
- Shows recent diary_entries from followed users:
  - "Alice listened to X" (type=heard)
  - "Bob rated Y 4 stars" (type=rating)
  - "Charlie reviewed Z" (type=review)
- Each item: user avatar, username, song thumbnail, action type icon, timestamp
- Sourced from: `diary_entries` JOIN `follows` WHERE `follower_id = current_user`
- No strangers in feed — that's Discovery

### 4. Diary Tab (`/home?tab=diary`)

- Chronological feed of the current user's `diary_entries`
- Filterable tabs: All / Heard / Want / Rated / Reviewed
- Each entry shows: song thumbnail, artist name, song title, type icon, rating (if present), body preview (if review), date/listened_on
- Click entry → navigate to that song page

---

## Build Order

1. Schema migration + API client modules (MusicBrainz REST API, Genius API)
2. Song page (all interactions: heard, want, rating, review, reviews feed)
3. Discovery tab (new releases + stranger recommendations)
4. Feed tab (following activity)
5. Diary tab (personal log)

**MVP: Feed + Discovery + Song Pages + Diary** — ship all four tabs together.

---

## Acceptance Criteria

- iTunes code fully removed from the codebase
- Apple OAuth button removed from auth page
- Searching a song name fetches MusicBrainz metadata and Genius artwork, stores it, and displays it
- Song page shows full metadata, allows heard/want/rate/review actions
- Review is editable for 48 hours, then locked
- Feed shows activity ONLY from followed users
- Discovery shows new releases by genre + stranger recommendations by Jaccard
- Diary shows user's personal interaction history, filterable by type
- All external API failures gracefully degrade with cached data
