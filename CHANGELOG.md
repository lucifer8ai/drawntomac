# Changelog

## 2026-07-14 — Discover Page

- Added Discover tab alongside Feed and Diary tabs
- Added "What's Hot" section with trending songs (week/month/all-time filters)
- Added "People" section with compatible user discovery (Best Match / Most Shared / Recent)
- Refactored People section with cleaner cards, hero match, and auto-fill grid
- Fixed profile picture/banner upload RLS policies and orphaned file cleanup
- Added `get_compatible_users` and `get_trending_songs` RPCs
- Added `display_name_visible` column to profiles

## 2026-07-11 — Schema Changes

- Rebuilt `diary_entries` table: like/dislike replace star ratings
- Made "heard" entries unique per user/song pair
- Added follower counts and profile location sync
- Split diary CHECK constraint for two-phase type migration
- Fixed `get_compatible_users` cross-join at scale

## 2026-07-09 — Design System

- Adopted DM Sans as unified font family
- Established OKLCH-based color system with grey primary accent
- Defined shape hierarchy: rounded-lg for controls, rounded-full for badges, rounded-2xl for cards
- Set action colors: red (like), green (heard), purple (want), blue (save), grey (dislike)

## 2026-07-08 — Profile Pages

- Added public profile pages at `/user/$username`
- Added own profile drawer (ProfileSheet) with edit capabilities
- Added Followers/Following sheet with follow/unfollow
- Added Taste Profile visualization with bar chart
- Added profile stats (heard, liked, disliked, want counts)
- Added banner/avatar upload with Supabase storage

## 2026-07-05 — Foundation

- Initial setup: TanStack Start + Supabase + Tailwind CSS v4
- Auth flow with Google OAuth
- Song detail pages with reviews and listen logging
- Feed timeline with coalesced friend activity
- Diary page with personal listening history
- MusicBrainz + Genius API integration for song data
