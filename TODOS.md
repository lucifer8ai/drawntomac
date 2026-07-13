# TODO

## Discover Page

### Compatibility query caching

**What:** Cache `get_compatible_users` results to avoid recomputing the self-join on every page visit.

**Why:** For users with 100+ diary entries, the self-join on `diary_entries` recomputes shared-song counts every time the People tab loads. An authenticated user visiting their Discover page multiple times per session runs the same expensive query each time.

**Pros:**
- Faster page loads for returning visitors
- Lower DB load at scale (1000+ active users)
- Could cache per-user for ~5 minutes in Supabase/Redis

**Cons:**
- Adds cache invalidation complexity (need to bust cache when user adds new diary entries)
- Premature optimization at current user count
- Materialized view needs a refresh strategy

**Context:** The RPC `get_compatible_users(uuid)` self-joins `diary_entries` on `song_id`, excludes blocked users, and returns top 20. Indexes `idx_diary_entries_song_user (song_id, user_id)` and `idx_diary_entries_created_at` are in place. A 5-minute client-side cache (useRef + timestamp in hook) or a Supabase materialized view would both work.

**Depends on:** RPC deployment (T2)

### TopMoversStrip + useTopMovers unit tests

**What:** Write unit tests for TopMoversStrip component and useTopMovers hook. Cover rankDelta display (↑N), "New" badge for debuts (null rankDelta), empty state (component returns null), and mixed climber+debut lists.

**Why:** Rising Fast currently has zero test coverage. The SQL fix changes what qualifies as a mover, and the "New" badge adds a new display branch. Without tests, future changes to the ranking logic or display will break silently.

**Pros:**
- Catches regressions when RPC ranking logic changes
- Documents expected behavior of rankDelta vs null display
- Completes test coverage for a user-facing feature

**Cons:**
- TopMoversStrip is a simple presentational component (70 lines)
- Not customer-facing enough to justify before launch

**Context:** TopMoversStrip renders a horizontal scrollable strip of `MoverSong` cards. `useTopMovers` calls `get_top_movers()` RPC and maps raw columns to MoverSong interface. Mock the supabase RPC call in tests. Current flow: null/error/empty array → component returns null. After the SQL fix, rankDelta can be null for debuts → needs to show "New" badge.

**Depends on:** RPC change deployment (SQL migration)
