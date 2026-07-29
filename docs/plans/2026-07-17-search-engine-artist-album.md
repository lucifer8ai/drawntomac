# Search Engine: Exact Match + Categorized Results + Album/Artist Pages

## Overview
4-stage plan covering search engine improvements, categorized search results, and new album/artist pages — each stage independently shippable.

**CEO Review mode:** SELECTIVE EXPANSION (full 4-stage plan + cherry-picked expansions)
**Expansions accepted:** E1 (artist social proof), E5 (album social proof)
**Expansions deferred:** E2 (search social proof), E3 (artist song count in search), E4 (related artists)

---

## Stage 1: Search Engine Fix (Exact Keyword Matching)

### Problem
Search bar queries MusicBrainz API with raw text (fuzzy Lucene token matching). No local DB search. "Shape of You" matches "Shape of My Heart" because tokens match independently.

### Changes

**1a. Database Migration (new)**
**File:** `supabase/migrations/20260717000000_search_indexes.sql`

```sql
-- Enable trigram extension for similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fast similarity + ILIKE queries
CREATE INDEX idx_songs_title_trgm ON public.songs USING gin (title gin_trgm_ops);
CREATE INDEX idx_artists_name_trgm ON public.artists USING gin (name gin_trgm_ops);

-- Local song search RPC: ILIKE + similarity ranking
CREATE OR REPLACE FUNCTION public.search_local_songs(
  p_query TEXT,
  p_limit INT DEFAULT 5
) RETURNS TABLE(
  song_id UUID,
  title TEXT,
  slug TEXT,
  artist_name TEXT,
  thumbnail_url TEXT,
  musicbrainz_id TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    s.id AS song_id,
    s.title,
    s.slug,
    a.name AS artist_name,
    s.genius_thumbnail_url AS thumbnail_url,
    s.musicbrainz_id,
    GREATEST(
      similarity(s.title, p_query),
      similarity(a.name, p_query)
    ) AS similarity
  FROM public.songs s
  LEFT JOIN public.artists a ON a.id = s.artist_id
  WHERE s.title ILIKE '%' || p_query || '%'
     OR a.name ILIKE '%' || p_query || '%'
  ORDER BY similarity DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_songs(TEXT, INT) TO anon, authenticated, service_role;
```

**Security note:** Function uses `SECURITY DEFINER` — runs as owner, bypasses RLS. Safe because it only SELECTs public data (song titles, artist names, thumbnails). `anon` grant is intentional for unauthenticated search.

**Empty query guard:** Add early return to all search RPCs to prevent full-table scan on empty string. Switch functions to `LANGUAGE plpgsql` and add at function start:
```sql
IF p_query IS NULL OR trim(p_query) = '' THEN RETURN; END IF;
```
Without this, `ILIKE '%%'` matches every row — a footgun if called directly (Supabase dashboard, future RPC consumers).

**1b. MusicBrainz Query Fix**
**File:** `src/lib/musicbrainz.ts` — `searchRecordings()`

Wrap ALL queries in `recording:"..."` for exact phrase matching. Escape Lucene special characters. Return type changes to `{ results, error }` for differentiated error handling.

```typescript
// Only characters that break phrase queries need escaping when inside quotes:
// backslash (escape char), double-quote (terminates phrase), and the control
// characters \t \r \n. Escaping *?~ is harmless but unnecessary inside quotes.
// AND/OR/NOT must be lowercase to avoid Lucene parsing them as operators.
function escapeLucene(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\t\r\n]/g, ' ');
}

// In searchRecordings():
const escapedQuery = escapeLucene(query);
const lowerQuery = escapedQuery.toLowerCase(); // prevent AND/OR/NOT as operators
let q = `recording:"${lowerQuery}"`;
if (artist) {
  q += ` AND artist:"${escapeLucene(artist).toLowerCase()}"`;
}
```

**Unicode:** Input should be NFC-normalized before escaping if the source (form input) may produce NFD strings (iOS keyboards, pasted text). Add `query.normalize('NFC')` in the search route, not inside `escapeLucene`.

**Note:** Only `searchRecordings` return type changes. `getRecordingByMbid()` is unaffected — it's used by `/api/import`, not search.

**1c. Search API Route — Local-First**
**File:** `src/routes/api/search.ts`

**Input sanitization note:** User input used in ILIKE concatenation (`'%' || query || '%'`) needs escaping for `%` and `_` wildcards. Add `p_query = replace(replace(p_query, '%', '\%'), '_', '\_')` inside each RPC function. Without this, a search for "100%" matches "100" + any chars. Unlikely to matter in practice (users don't search for percent signs), but correctness demands it.

Modify `GET` handler:

```
                         ┌──────────────────┐
User types "Shape"  ──→  │ /api/search?q=...│
                         └────────┬─────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ search_local_songs(q, 5)   │
                    │ (Supabase RPC)             │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ Results found?             │
                    └──┬─────────────────────┬──┘
                       │ YES                 │ NO / <8 results
                       ▼                     ▼
              ┌──────────────┐    ┌──────────────────────┐
              │ Map to hits  │    │ searchRecordings()    │
              │ (DB artwork) │    │ (MusicBrainz API)    │
              └──────┬───────┘    └──────────┬───────────┘
                     │                       │
                     │              ┌────────▼───────────┐
                     │              │ Dedup by mbid       │
                     │              │ vs local results    │
                     │              └────────┬───────────┘
                     │                       │
                     └───────────┬───────────┘
                                 ▼
                    ┌────────────────────────┐
                    │ Return combined hits   │
                    │ (local first, MB last) │
                    │ No blocking Genius     │
                    └────────────────────────┘
```

Key changes:
- Call `search_local_songs(q, 5)` RPC first. Wrap in try/catch — fall back to MusicBrainz-only if RPC fails.
- Map to `SearchHit[]` (thumbnailUrl from DB, skip Genius enrichment)
- If local results < 8, call `searchRecordings()` for remainder, dedup by `musicbrainz_id`
- Merge: local results first, MusicBrainz results second
- Drop blocking `Promise.allSettled` for Genius — return hits immediately, client handles ♫ placeholder
- Add 10s route-level timeout via `AbortController`
- Add in-flight request deduplication: cache pending `Promise<Response>` keyed by `q + artist`, return the same promise if a matching request is already in flight. Clears on completion/error. This prevents duplicate MusicBrainz calls when the client fires rapid requests during typing.

**1d. Input Validation**
**File:** `src/routes/api/search.ts`

Add after the empty-check:
```typescript
if (q.length > 200) {
  return Response.json({ error: "Query too long" }, { status: 400 });
}
```

**1e. Error Handling**
**File:** `src/lib/musicbrainz.ts` — `searchRecordings()`

Change return type from `Promise<ParsedMusicBrainzResult[]>` to `Promise<{ results: ParsedMusicBrainzResult[]; error?: string }>`. Search route returns 429 with `"Search temporarily unavailable"` on MusicBrainz failure instead of empty `[]`.

**1f. Observability**
Add structured logging to `/api/search`:
```typescript
console.log("[search]", { query: q, localCount: localHits.length, mbCount: mbHits.length, durationMs });
```
On error: `console.error("[search] local RPC failed, falling back to MB only", err)`.

**1g. Tests**
**File:** `tests/routes/api/search.test.ts` (new)
- Empty query returns `[]`
- Query with local match returns DB result with title + slug + thumbnail
- Query with no local match falls back to MusicBrainz results
- Local RPC failure gracefully falls back to MusicBrainz-only
- `?artist=` param filters correctly
- MusicBrainz error returns 429 with error message
- Query > 200 chars returns 400
- Lucene special characters (`+`, `-`, `!`) are escaped — verify the fetch URL
- 10s timeout on route

**File:** `tests/musicbrainz.test.ts` (add)
- `searchRecordings()` wraps plain query in `recording:"..."`
- Query with artist wraps in `recording:"..." AND artist:"..."`
- Special characters escaped correctly
- Return type includes `{ results, error }` shape
- URL encoding correct

---

## Stage 2: Categorized Search Results

### Problem
Search dropdown is a flat list of songs. Users can't distinguish songs from artists from albums.

### Changes

**2a. SearchHit type — add category**
**File:** `src/routes/api/search.ts`

```typescript
type SearchCategory = "song" | "artist" | "album";

interface SearchHit {
  category: SearchCategory;
  mbid: string;
  title: string;
  subtitle: string;
  slug: string;
  thumbnailUrl: string | null;
}
```

**2b. Local artist search RPC (new)**
**File:** `supabase/migrations/20260717000001_search_artists_and_albums.sql`

```sql
CREATE OR REPLACE FUNCTION public.search_local_artists(
  p_query TEXT,
  p_limit INT DEFAULT 3
) RETURNS TABLE(
  artist_id UUID,
  name TEXT,
  slug TEXT,
  image_url TEXT,
  musicbrainz_id TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id AS artist_id,
    a.name,
    a.slug,
    a.image_url,
    a.musicbrainz_id,
    similarity(a.name, p_query) AS similarity
  FROM public.artists a
  WHERE a.name ILIKE '%' || p_query || '%'
  ORDER BY similarity DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_artists(TEXT, INT) TO anon, authenticated, service_role;
```

**2c. Local album search RPC (new)**
**File:** `supabase/migrations/20260717000001_search_artists_and_albums.sql`

```sql
-- Stage 2 version: groups songs by release_group_mbid
-- Stage 4 version: queries release_groups table directly
CREATE OR REPLACE FUNCTION public.search_local_albums(
  p_query TEXT,
  p_limit INT DEFAULT 3
) RETURNS TABLE(
  release_group_mbid TEXT,
  title TEXT,
  artist_name TEXT,
  cover_url TEXT,
  song_count BIGINT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT DISTINCT ON (s.release_group_mbid)
      s.release_group_mbid,
      s.title,
      a.name AS artist_name,
      s.genius_thumbnail_url AS cover_url,
      similarity(s.title, p_query) AS sim
    FROM public.songs s
    LEFT JOIN public.artists a ON a.id = s.artist_id
    WHERE s.release_group_mbid IS NOT NULL
      AND (
        s.title ILIKE '%' || p_query || '%'
        OR (a.name IS NOT NULL AND a.name ILIKE '%' || p_query || '%')
      )
    ORDER BY s.release_group_mbid, sim DESC
  ),
  counted AS (
    SELECT
      s.release_group_mbid,
      COUNT(*) AS song_count
    FROM public.songs s
    WHERE s.release_group_mbid IN (SELECT release_group_mbid FROM ranked)
    GROUP BY s.release_group_mbid
  )
  SELECT
    r.release_group_mbid,
    r.title,
    r.artist_name,
    r.cover_url,
    COALESCE(c.song_count, 0) AS song_count,
    r.sim AS similarity
  FROM ranked r
  LEFT JOIN counted c ON c.release_group_mbid = r.release_group_mbid
  ORDER BY r.sim DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_local_albums(TEXT, INT) TO anon, authenticated, service_role;
```

**Fix applied:** Uses `DISTINCT ON ... ORDER BY sim DESC` instead of `MIN(title)` to pick the best-matching song title as the album title proxy. Also searches by artist name (albums where the artist matches, even if song titles don't).

**2d. Search API — multi-category results**
**File:** `src/routes/api/search.ts`

**API versioning note:** Stage 2 changes the response shape from `SearchHit[]` (flat array) to `{ songs, artists, albums }`. This is a **breaking change** for the client. Two options:
1. **Versioned endpoint:** Serve Stage 2 response at `/api/search?version=2`, keep `/api/search` returning flat array until client is updated. Add `version` query param parsing. Remove flat-array path after client deploys.
2. **Coordinated deploy:** Deploy server + client together. Simpler for a single-developer project. Document the deployment order.

Use option 2 (coordinated deploy). The client-side `fetch("/api/search")` handler in AppHeader must be updated in the same PR that ships Stage 2's server change.

Run all three local searches in parallel using `Promise.allSettled()` (not `Promise.all` — partial failures handled gracefully). Return as categorized sections:

```json
{
  "songs": [...],
  "artists": [...],
  "albums": [...]
}
```

Categories with zero results are present as empty arrays.

**2e. Search dropdown — sectioned UI**
**File:** `src/components/AppHeader.tsx` — hits rendering

Replace flat list with sectioned display:

```
┌─ Songs ───────────────────────────┐
│ ♫ Shape of You                    │
│   Ed Sheeran                      │
│ ♫ Shape of My Heart               │
│   Sting                           │
├─ Artists ─────────────────────────┤
│ 👤 Ed Sheeran                     │
├─ Albums ──────────────────────────┤
│ 💿 ÷ (Deluxe) — Ed Sheeran (16)   │
└───────────────────────────────────┘
```

Each section has a heading with count. Song hits show ♫ icon. Artist hits show avatar circle with initial. Album hits show cover thumbnail + song count badge. Sections with zero results are hidden. Empty state (all categories empty): "No matches for '{query}'."

**2f. pickResult — category-based navigation**
**File:** `src/components/AppHeader.tsx`

Replace `pickSong(hit)` with `pickResult(hit)`:
- `song` → `POST /api/import` → navigate to `/song/$slug`
- `artist` → navigate directly to `/artist/$slug` (no import needed — artist page loader queries the DB)
- `album` → until Stage 4 ships: navigate to the first song in that release group (query `songs` by `release_group_mbid`), or show toast "Album pages coming soon". After Stage 4: navigate to `/album/$slug`.

**Guard against double-click:** Use a `navigating` ref that blocks re-entry during navigation/import. **Stage 1 note:** The existing `pickSong` also needs this guard — add it immediately in Stage 1, not deferred to Stage 2.

**2g. Tests**
**File:** `tests/routes/api/search.test.ts` — add:
- Multi-category response shape with all three arrays
- Empty categories still present as `[]`
- Partial RPC failure (one of three fails) returns results for the other two
- Artist-only query returns artist results but empty songs/albums

---

## Stage 3: Artist Page

### Problem
Artists exist in the DB with slugs but no page exists. Artist names are nowhere clickable. Search results link to artist pages (Stage 2), so the destination must exist.

### Changes

**3a. Artist page route**
**File:** `src/routes/artist.$slug.tsx` (new)

Follows the song page template exactly:
- `loader`: `supabase.from("artists").select("*, songs:songs(*)").eq("slug", params.slug).maybeSingle()`, throw `notFound()`
- Safety: cap songs at 100. **IMPORTANT:** Supabase nests the limit — `.limit(100)` on the parent query limits parent rows (always 1 artist), not child songs. Use native Postgres `LIMIT` on the join or a separate query. Correct approach:
  ```typescript
  // Option A: Two queries (simpler, more predictable)
  const { data: artist } = await supabase.from("artists")
    .select("*").eq("slug", params.slug).maybeSingle();
  if (!artist) throw notFound();
  const { data: songs } = await supabase.from("songs")
    .select("*").eq("artist_id", artist.id).order("release_date", { ascending: false }).limit(100);
  // Option B: Single query with !inner join + explicit limit scope notation
  // .select("*, songs:songs(*)").limit(100, { foreignTable: "songs" }) — verify against your Supabase version
  ```
- `loader`: Fetch artist + songs separately to avoid Supabase nested-limit bug (see note above). Include `artist_countries` field:
  ```typescript
  const { data: artist } = await supabase.from("artists")
    .select("*, artist_countries").eq("slug", params.slug).maybeSingle();
  ```
- `head`: dynamic `og:title` (`artist.name`), `og:image` (`artist.image_url`), `og:description`
- `component`: Artist page with two-column layout
- `errorComponent` + `notFoundComponent`: wrapped in `ArtistShell` (BackHeader + bg-background)

**BackHeader destination:** All new routes use `BackHeader` with `to="/home"` as the default back destination. The BackHeader component should accept an optional `to` prop, defaulting to `/home`.

**Revalidation after import:** When navigating from search to `/song/$slug` after a fresh import, the server-side loader may hit a read replica or stale cache. Add a short retry in the song page loader (up to 3 retries, 200ms apart) when the song is not found, or use `supabase.from("songs").select(...).maybeSingle()` with `Cache-Control: no-cache` headers on the route response.

**3b. Artist engagement RPC (new — E1 expansion)**
**File:** `supabase/migrations/20260717000002_artist_album_engagement.sql`

```sql
CREATE OR REPLACE FUNCTION public.get_artist_engagement(
  p_artist_id UUID
) RETURNS TABLE(
  total_hears BIGINT,
  total_likes BIGINT,
  total_reviews BIGINT,
  total_listeners BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  WHERE s.artist_id = p_artist_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_artist_engagement(UUID) TO anon, authenticated, service_role;
```

**Performance note:** For artists with 10k+ diary entries, this aggregates across all `diary_entries JOIN songs`. The FK indexes (`songs.artist_id`, `diary_entries.song_id`) are sufficient for the JOIN path, but filtered aggregates benefit from a covering index on diary entries:
```sql
CREATE INDEX IF NOT EXISTS idx_de_song_type ON public.diary_entries(song_id, type);
```
This avoids a sequential scan on `diary_entries` for popular artists. Evaluate whether to include in Stage 3 based on current table size — add it eagerly (cost is low, benefit is high).

**3c. Artist page components**
**Directory:** `src/components/artist/` (new)

| Component | Purpose |
|-----------|---------|
| `ArtistHero.tsx` | Large artist image (or gradient fallback with initial). Max height 320px. |
| `ArtistHeader.tsx` | Name (line-clamp-2 for long names), genre tags, country (from `artist_countries` array — show first match in ALLOWED_COUNTRIES, or country with most songs), engagement stats from RPC |
| `ArtistSongs.tsx` | Grid/list of songs. Each card: cover art, title, release date. Links to `/song/$slug`. Empty state: "No songs yet." with muted text. |
| `index.ts` | Barrel export |

Layout:
```
┌─ BackHeader ───────────────────────┐
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ ArtistHero   │  │ Artist Name  │  │
│  │ (320px img)  │  │ Genre tags   │  │
│  │              │  │ Country      │  │
│  └─────────────┘  │ 142 listens  │  │  ← E1: engagement stats
│                   │ 38 likes     │  │
│                   │ 12 reviews   │  │
│                   └──────────────┘  │
│                                     │
│  Songs section (full width)         │
│  ┌─ ArtistSongs ───────────────┐   │
│  │  SongCard  SongCard  ...     │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

Mobile: single column — hero image first, header below, song list full width.

**3d. Link artist names everywhere**
Files to update:
- `src/components/song/SongHeader.tsx` — artist name becomes `<Link to="/artist/$slug">`
- `src/components/AppHeader.tsx` — search result artist subtitle navigates to artist page when category=artist
- Any other component rendering artist names (grep for `artist.name` or `artist?.name`)

**3e. Tests**
**File:** `tests/routes/artist.test.tsx` (new)
- Loader returns artist + songs
- notFoundComponent renders for invalid slug
- Song count displayed
- Engagement stats displayed (hears, likes, reviews)
- Song cards link to `/song/$slug`
- Artist name in SongHeader links to `/artist/$slug`

---

## Stage 4: Album Page

### Problem
No album data model exists. `songs.release_group_mbid` is a raw string — no table, no page, no grouping. Album search results (Stage 2) need a destination page, and artist pages show songs but don't group by album.

### Changes

**4a. Release Groups Table (new migration)**
**File:** `supabase/migrations/20260718000000_release_groups.sql`

```sql
-- PL/pgSQL slugify helper (replaces JS slugify_base for migration use)
CREATE OR REPLACE FUNCTION public.slugify_base(input TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT trim(both '-' from lower(regexp_replace(
    regexp_replace(
      regexp_replace(input, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )));
$$;

CREATE TABLE public.release_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  musicbrainz_id TEXT UNIQUE NOT NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  primary_type TEXT,
  image_url TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_songs_release_group_mbid ON public.songs(release_group_mbid);

-- Backfill: create release_groups from existing songs.
-- Slug uses UUID prefix to avoid collisions (follows JS generateSlug pattern).
-- Song title is a fallback for albums missing release-group metadata; the
-- BEST-matching song title (by trigram similarity) is used as the display title
-- until MusicBrainz enrichment provides the canonical album title.
INSERT INTO public.release_groups (title, slug, musicbrainz_id, artist_id, image_url, release_date)
SELECT DISTINCT ON (s.release_group_mbid)
  COALESCE(NULLIF(s.release_group_mbid, ''), s.title) AS title,
  public.slugify_base(COALESCE(s.release_group_mbid, s.title)) || '-' || left(gen_random_uuid()::text, 8) AS slug,
  s.release_group_mbid,
  s.artist_id,
  s.genius_thumbnail_url AS image_url,
  s.release_date
FROM public.songs s
WHERE s.release_group_mbid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.release_groups rg WHERE rg.musicbrainz_id = s.release_group_mbid
  )
ON CONFLICT (musicbrainz_id) DO NOTHING;

ALTER TABLE public.songs ADD COLUMN release_group_id UUID REFERENCES public.release_groups(id) ON DELETE SET NULL;

-- Rollback:
-- ALTER TABLE songs DROP COLUMN release_group_id;
-- DROP TABLE release_groups;

-- Verification queries:
-- SELECT COUNT(*) FROM release_groups; -- should equal SELECT COUNT(DISTINCT release_group_mbid) FROM songs WHERE release_group_mbid IS NOT NULL;
-- SELECT COUNT(*) FROM songs WHERE release_group_id IS NOT NULL; -- should equal songs with release_group_mbid
```

**Fix applied:** Created `public.slugify_base()` PL/pgSQL function so the backfill SQL is self-contained. Rollback commands documented in comments.

**RLS note:** Release groups table needs explicit RLS policies (readable by all, insert/update for authenticated + service_role), matching the artists/songs pattern. Add after CREATE TABLE:
```sql
ALTER TABLE public.release_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "release_groups readable by all" ON public.release_groups FOR SELECT USING (true);
CREATE POLICY "authed insert release_groups" ON public.release_groups FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "authed update release_groups" ON public.release_groups FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
```

**4b. Update import flow + SearchHit type**
**File:** `src/routes/api/search.ts` — `SearchHit` interface
Add `releaseGroupTitle` to `SearchHit`:
```typescript
export interface SearchHit {
  // ... existing fields ...
  releaseGroupTitle: string | null;  // needed for import → release_groups upsert
}
```

**File:** `src/routes/api/import.ts` — body schema + handler
Add `releaseGroupTitle` to zod schema:
```typescript
const bodySchema = z.object({
  // ... existing fields ...
  releaseGroupTitle: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),  // already exists, but verify
});
```

After artist upsert, before song upsert:
```typescript
if (body.releaseGroupMbid) {
  // Fetch canonical title from MusicBrainz if not provided by the client
  let rgTitle = body.releaseGroupTitle || body.title;
  if (!body.releaseGroupTitle && body.releaseGroupMbid) {
    try {
      const rgRes = await fetch(
        `https://musicbrainz.org/ws/2/release-group/${encodeURIComponent(body.releaseGroupMbid)}?fmt=json`
      );
      if (rgRes.ok) {
        const rgData = await rgRes.json() as { title?: string };
        rgTitle = rgData.title || body.title;
      }
    } catch { /* fall back to body.title */ }
  }

  const releaseGroupSlug = await generateSlug(rgTitle);
  const { error: rgErr } = await supabaseAdmin.from('release_groups').upsert({
    musicbrainz_id: body.releaseGroupMbid,
    title: rgTitle,
    slug: releaseGroupSlug,
    artist_id: artistId,
    image_url: genius.thumbnailUrl,
    release_date: body.releaseDate || null,
  }, { onConflict: 'musicbrainz_id' });
  if (rgErr) console.error("[import] release_group upsert failed:", rgErr);
}
```
```

**4c. Album engagement RPC (new — E5 expansion)**
**File:** `supabase/migrations/20260717000002_artist_album_engagement.sql` (same file as artist engagement)

```sql
CREATE OR REPLACE FUNCTION public.get_album_engagement(
  p_release_group_id UUID
) RETURNS TABLE(
  total_hears BIGINT,
  total_likes BIGINT,
  total_reviews BIGINT,
  total_listeners BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE de.type = 'heard') AS total_hears,
    COUNT(*) FILTER (WHERE de.type = 'like') AS total_likes,
    COUNT(*) FILTER (WHERE de.type = 'review') AS total_reviews,
    COUNT(DISTINCT de.user_id) AS total_listeners
  FROM public.diary_entries de
  JOIN public.songs s ON s.id = de.song_id
  WHERE s.release_group_id = p_release_group_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_album_engagement(UUID) TO anon, authenticated, service_role;
```

**4d. Album page route**
**File:** `src/routes/album.$slug.tsx` (new)

Loader: `supabase.from("release_groups").select("*, artist:artists(*), songs:songs(*)").eq("slug", params.slug).maybeSingle()`

**Song limit:** Same Supabase nested-limit issue as the artist page. Use two-query approach — fetch release_group, then fetch songs separately with `.limit(200)`.

Layout:
```
┌─ BackHeader ───────────────────────┐
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ AlbumCover   │  │ Album title  │  │
│  │ (320px)      │  │ Artist link  │  │
│  │              │  │ Release date │  │
│  └─────────────┘  │ Album · 12 tracks│  │
│                   │ 89 listens    │  │  ← E5: engagement stats
│                   │ 23 likes      │  │
│                   └──────────────┘  │
│                                     │
│  Tracklist (full width)             │
│  ┌──────────────────────────────┐   │
│  │ #  Title              Listens│   │
│  │ 1  Shape of You       247    │   │
│  │ 2  Castle on the Hill  89    │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

Tracklist: numbered rows, each links to `/song/$slug`. **Ordering:** The `songs` table has no `track_number` column. Until `track_number` is populated (future import enhancement), order by `release_date ASC, created_at ASC` as a best-effort approximation. Add a `track_number INT` column to the songs table in the release_groups migration:

```sql
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS track_number INT;
```

The import flow can populate `track_number` from MusicBrainz recording data in a follow-up. For now, the tracklist displays positionally (1..N in sort order) with a footnote that track order is approximate until enriched.

**4e. Album page components**
**Directory:** `src/components/album/` (new)

| Component | Purpose |
|-----------|---------|
| `AlbumCover.tsx` | Cover art (320px, rounded-lg). Gradient fallback on null image. |
| `AlbumHeader.tsx` | Title, artist link, release date, type badge, track count, engagement stats |
| `TrackList.tsx` | Numbered tracklist, each row links to `/song/$slug` |
| `index.ts` | Barrel export |

**4f. Update Stage 2 album search RPC**
Once `release_groups` table exists, replace `search_local_albums` RPC to query `release_groups` directly instead of grouping from `songs`. Add ILIKE search on `release_groups.title` and `artists.name`.

**4g. Tests**
**File:** `tests/routes/album.test.tsx` (new)
- Loader returns album + artist + songs
- notFoundComponent for invalid slug
- Tracklist renders with correct count
- Song rows link to `/song/$slug`
- Engagement stats displayed (hears, likes, reviews)
- Empty album (0 songs) shows "No songs" empty state

---

## Cross-Cutting: Mobile Friendly URLs

All new routes follow the existing pattern: `/song/$slug`, `/artist/$slug`, `/album/$slug`. No nesting. Each entity gets its own top-level route with BackHeader navigation. All pages collapse to single-column layout at mobile breakpoint.

## Dependencies Between Stages

| Stage | Depends On | Can Ship Alone |
|--------|------------|----------------|
| 1. Search fix | Nothing | Yes |
| 2. Categorized results | Stage 1 (local search RPCs) | No |
| 3. Artist page | Nothing (search links optional) | Yes — if Stage 2 deferred, artist names become links directly |
| 4. Album page | Stage 3 (same patterns), migration | Yes |

Recommended ship order: 1 → 2 → (3 and 4 in parallel or either order)

## What This Does NOT Change

- **Import flow** core logic — only extended to upsert release_groups (Stage 4)
- **Slash syntax** (`song/artist`)
- **MusicBrainz deduplication** (`deduplicateRecordings`, `scoreRelease`)
- **Rate limiter** (1 req/s)
- **Song page** — artist name becomes a link, nothing else changes

---

## Design Compliance

All new pages follow DESIGN.md:
- **Color:** Monochrome palette. No new color tokens. Artist/album images are the only colorful element — "color is earned through interaction."
- **Typography:** DM Sans, single unified font family. Weight contrast (200-900) for hierarchy.
- **Shape:** Artist/album images `rounded-lg`. Cards `rounded-2xl`. No new shape tokens.
- **Mobile:** Single-column collapse at `md` breakpoint — hero image above, text/header below, list full width. Same as song page pattern.

---

## GSTACK REVIEW REPORT

### Runs

| Review | Status | Findings |
|--------|--------|----------|
| Premise Challenge | DONE | Right problem. Deeper job: make drawnTo feel like a music platform, not a song filing cabinet. |
| Dream State Mapping | DONE | Plan moves toward interlinked entity graph. Missing: social proof on new pages (accepted E1, E5). |
| Implementation Alternatives | DONE | 3 approaches. Chose full 4-stage plan. |
| Mode Selection | DONE | SELECTIVE EXPANSION with 2 expansions accepted, 3 deferred. |
| Architecture | DONE | 8 issues (4 original + 4 new): SQL-JS slug mismatch, backfill slug collision, missing RLS, Supabase nested-limit bug. |
| Security | DONE | SECURITY DEFINER functions correct. anon grants intentional. ILIKE wildcard escaping added. Empty-query guard added to RPCs. |
| Error Handling | DONE | 5 issues: RPC fallback, Promise.allSettled, route timeout, import revalidation, double-click guard backported to Stage 1. |
| Data Flow | DONE | 8 shadow paths traced. API response shape breaking change documented with coordinated deploy strategy. In-flight request dedup added. |
| Edge Cases | DONE | 11 edge cases: all original 6 + zero-song artist, orphaned-artist LEFT JOIN, ILIKE wildcard escaping, empty-query full-table scan, 0-track album. |
| Observability | DONE | Structured logging on search, import, RPC failures. |
| Database | DONE | Migration ordering verified. Rollback documented. Backfill slug collision fixed (UUID suffix + ON CONFLICT). track_number column added. Flaky supabase nested limit pattern replaced with two-query approach. Engagement RPC index recommended. |
| Tests | DONE | 4 new test files. Integration test gap flagged. Backfill test added. |
| Deployment | DONE | pg_trgm is one-way (safe). API breaking change coordinated deploy strategy. Return type change scoped. |
| Design (Pass 1-7) | DONE | 8 design findings: search keyboard nav, artist/album hierarchy, transitional animation, editorial hero layout, tracklist design, song grid pattern, responsive search, full a11y spec. |

### Findings (36 total — 16 original + 20 new loophole discoveries)

**Round 1 findings (resolved):**
1. **Backfill SQL bug:** `slugify_base` is JS, not SQL. Fixed: created PL/pgSQL helper in migration.
2. **Album hit gap:** Stage 2 album results have no destination before Stage 4. Fixed: documented fallback behavior.
3. **MIN(title) proxy:** Album title from alphabetical `MIN` is wrong. Fixed: `DISTINCT ON ... ORDER BY sim DESC`.
4. **Missing try/catch on RPC:** Local search failure unhandled. Added fallback to MusicBrainz-only.
5. **Promise.all → allSettled:** Parallel RPC failure would kill all categories. Fixed.
6. **No route timeout:** 15s MusicBrainz timeout but no route-level cap. Added 10s AbortController.
7. **Double-click guard:** Missing on search result pick. Added `navigating` ref, backported to Stage 1.
8. **Zero results state:** Empty dropdown stays open with no message. Added "No matches" text.
9. **Long artist names:** No truncation. Added `line-clamp-2` to ArtistHeader.
10. **200+ songs on artist page:** No cap. Fixed Supabase nested-limit bug, added two-query approach with .limit(100).
11. **0-song album:** Empty album page has no state. Added "No songs" empty state.
12. **No observability:** Zero logging. Added structured console.log to search, import, RPC failures.
13. **Integration test gap:** Trigram behavior untestable with mocks. Flagged for local Supabase testing.
14. **Backfill verification:** No post-migration integrity check. Added SQL verification queries.
15. **Rollback docs:** release_groups migration had no rollback. Added documented DROP commands.
16. **E1/E5 social proof:** Artist and album pages were empty shells. Added engagement RPCs.

**Round 2 findings (resolved):**
17. **SQL-JS slug mismatch:** SQL `slugify_base` missing `trim(both '-'...)` — diverged from JS slugifyBase which strips leading/trailing hyphens. Fixed: added `trim()` wrapper.
18. **Backfill slug collision:** Two release groups with identical titles → UNIQUE constraint violation → entire INSERT fails. Fixed: UUID suffix on slug + `ON CONFLICT DO NOTHING`.
19. **Missing RLS on release_groups:** New table created without RLS policies. Fixed: added SELECT/INSERT/UPDATE policies.
20. **Supabase nested-limit bug:** `.limit(100)` on parent query limits parent rows (always 1 artist), not child songs. Fixed: two-query approach for artist + album loaders.
21. **API response shape breaking change:** Stage 1 returns `SearchHit[]`, Stage 2 returns `{ songs, artists, albums }`. Client `Array.isArray()` check silently breaks. Fixed: documented coordinated deploy strategy.
22. **Import body missing `releaseGroupTitle`:** Stage 4b references `body.releaseGroupTitle` but zod schema + SearchHit type lack it. Fixed: added field to type, schema, and MusicBrainz fetch fallback.
23. **Empty query full-table scan:** RPCs with `''` do `ILIKE '%%'` → matches every row. Fixed: added `IF trim(p_query) = '' THEN RETURN` guard (switched to plpgsql).
24. **ILIKE wildcard injection:** User query containing `%` or `_` acts as LIKE wildcard. Fixed: escape `%` and `_` inside RPCs.
25. **Orphaned artist LEFT JOIN:** `a.name ILIKE '%q%'` with NULL artist_id → NULL → row filtered out silently. Fixed: added `a.name IS NOT NULL AND` guard.
26. **No track_number column:** Album tracklist shows ordered tracks but songs table has no track position. Fixed: added `track_number INT` column + best-effort sort order.
27. **escapeLucene over-escaped:** Plan escaped all Lucene special chars, but inside `recording:"..."` only `\` and `"` need escaping. Fixed: narrowed to actual phrase-query escapes + AND/OR/NOT lowercase guard + Unicode NFC normalization note.
28. **No server request dedup:** Rapid typing fires duplicate MusicBrainz calls (rate-limited at 1/s). Fixed: added in-flight promise cache keyed by `q+artist`.
29. **Zero-song artist empty state:** ArtistSongs has no empty state. Fixed: added "No songs yet." message.
30. **BackHeader destination unspecified:** No default back navigation target. Fixed: default `to="/home"`.
31. **No revalidation after import→navigate:** Just-imported song may 404 on first navigation. Fixed: retry logic in song page loader (3 retries, 200ms apart).
32. **artist_countries unused:** Field exists on artists table but plan's ArtistHeader doesn't reference it. Fixed: added to loader select + header display.
33. **Engagement RPC full-scan risk:** Popular artists with 10k+ entries need covering index. Fixed: recommended `idx_de_song_type(song_id, type)`.
34. **Stage 1 pickSong needs double-click guard too:** Guard was only added in Stage 2f. Fixed: backported to Stage 1.
35. **Album search returns song titles as album titles:** `DISTINCT ON` picks song title, not album title. Documented as "best-effort until release_groups table" with UUID-suffixed slugs.
36. **On-disk slug format mismatch:** JS `generateSlug` uses `slugifyBase-title-UUID` but SQL backfill slug now uses same pattern. Verified consistency.

### Findings (44 total — 36 engineering + 8 design)

**Design findings (Pass 1-7 — Round 3):**

37. **Search dropdown keyboard navigation (1A):** Flat list has no keyboard nav spec. Sectioned list needs linear arrow-key traversal across all hits, Tab to jump between sections. Resolved: arrow keys traverse all hits linearly, Tab cycles between sections, Escape closes.
38. **Artist page visual hierarchy (1B):** Plan's box diagram has no visual anchor. Resolved: name-dominant layout — artist name at `text-4xl font-extrabold tracking-tight text-foreground`, hero image at 280-320px viewport-width editorial full-bleed with gradient scrim overlay for name/stats. Album page keeps 320px contained square (matching song page CoverArt).
39. **Partial search result visual state (2A):** Empty sections silently hidden — user can't tell if a category was searched. Resolved: all 3 sections always rendered; empty sections show "No [category] found" muted sub-label.
40. **Search error state (2C):** Current code silently shows "No matches" on network failure. Resolved: differentiated error state — "Search unavailable — try again" with retry button; `text-muted-foreground` for empty, `text-destructive/80` for error.
41. **Search dropdown transition animation (3A):** Flat→sectioned transition has no motion design. Resolved: staggered section reveal — sections fade+slide in at 0ms (Songs), 80ms (Artists), 160ms (Albums), each 200ms `animate-scale-in` per section. Signals organization, not raw data dump.
42. **Artist page entry animation (3B):** No emotional arc on page load. Resolved: hero image `animate-fade-in-up` (300ms), artist name delayed 120ms, engagement stats count-up from 0 over 600ms (`useCountUp`), song list staggers `animate-fade-in-up` per row with 50ms delay increments.
43. **Artist hero visual treatment (4A):** Two-column layout at risk of generic SaaS profile card. Resolved: editorial full-bleed photo — artist image fills viewport width at 280-320px height with gradient scrim (black-to-transparent, `bg-gradient-to-t from-background/80 to-transparent`). Name + genre tags + engagement stats overlay at bottom-left. On mobile, height reduces to 220px.
44. **Accessibility (6B):** Zero a11y spec. Resolved: full a11y scope added — ARIA landmarks per page (`<main>`, `<nav>`, `<section aria-label="...">`), focus management on dropdown open/close (focus first hit or search input), `focus-visible:ring-1 focus-visible:ring-ring` on all interactive elements, 44px minimum touch targets, skip-to-content link on new pages, `prefers-reduced-motion` replacing animations with `0.01ms`, `aria-label` on all icon-only buttons, `aria-expanded` on search toggle, `role="listbox"`/`role="option"` on search hits.

### Design Specifications (Addendum)

#### Search Dropdown — Sectioned Layout

```ascii
┌────────────────────────────────────────┐
│  ┌ SONGS (3) ──────────────────────┐   │  ← section header: text-[11px] font-semibold
│  │ ♫ Shape of You                  │   │     uppercase tracking-wider text-muted-foreground/60
│  │   Ed Sheeran                    │   │     px-2 pt-2 pb-1
│  │ ♫ Shape of My Heart            │   │
│  │   Sting                         │   │  ← hits: flex items-center gap-3 rounded-xl p-2
│  └─────────────────────────────────┘   │     hover:bg-white/5 transition-colors
│  ┌ ARTISTS (2) ────────────────────┐   │     song thumbnail: 40×40 rounded object-cover
│  │ 👤 Ed Sheeran                   │   │     artist avatar: 40×40 rounded-full, bg-white/10
│  │ 👤 Sade                         │   │     album cover: 40×40 rounded object-cover
│  └─────────────────────────────────┘   │     title: text-sm font-semibold text-foreground truncate
│  ┌ ALBUMS (2) ────────────────────┐   │     subtitle: text-xs text-muted-foreground truncate
│  │ 💿 ÷ (Deluxe) — Ed Sheeran (16)│   │     track badge: rounded-full px-2 py-0.5 text-[10px]
│  │ 💿 Diamond Life — Sade (9)     │   │       font-medium bg-white/10 text-muted-foreground
│  └─────────────────────────────────┘   │
│                                         │  ← empty section: text-[11px] italic text-muted-foreground/50
│  No artists found                       │     "No [category] found" (always visible when empty)
│                                         │  ← error state: "Search unavailable — try again"
│  ⚠ Search unavailable — try again      │     text-xs text-destructive/80, retry button as link
└────────────────────────────────────────┘
```

**Keyboard nav:**
- `↓`/`↑`: traverse all hits linearly across sections
- `Tab`: cycle between section headers (screen reader orientation)
- `Enter`: select highlighted hit (calls `pickResult`)
- `Escape`: close dropdown, return focus to search input
- `Home`/`End`: jump to first/last hit

**Dropdown container:** `absolute left-0 right-0 top-full z-[9999] mt-2 max-h-[420px] overflow-y-auto rounded-2xl border bg-popover/98 p-2` (no shadow — depth via `bg-popover` lightness step per DESIGN.md).

**Transition:** Section wrappers each get `animate-scale-in` with staggered `animation-delay: 0ms, 80ms, 160ms`. Error state and empty labels render immediately (no animation).

#### Artist Page Layout

```ascii
┌─ BackHeader (to="/home") ──────────────────────────────────────┐
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Artist image (full viewport width, 280-320px height)      │  │
│  │  object-cover, no border-radius (full-bleed)               │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ gradient scrim (bg-gradient-to-t from-background/80  │  │  │
│  │  │ to-transparent, bottom 40% of image)                │  │  │
│  │  │                                                      │  │  │
│  │  │  Artist Name                                         │  │  │  ← text-4xl font-extrabold
│  │  │  text-foreground tracking-tight                      │  │  │     tracking-tight
│  │  │                                                      │  │  │
│  │  │  Genre · Genre · Genre  🇺🇸 United States          │  │  │  ← genre tags: rounded-full
│  │  │                                                      │  │  │     bg-border px-3 py-1
│  │  │  142 listens · 38 likes · 12 reviews                 │  │  │     text-xs font-medium
│  │  │                                                      │  │  │     text-muted-foreground
│  │  └──────────────────────────────────────────────────────┘  │  │     (reused SongHeader pattern)
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Songs (24)                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ title    │ │ title    │ │ title    │ │ title    │           │  ← minimal list: title only
│  │ date     │ │ date     │ │ date     │ │ date     │           │     (no thumbnail — artist page
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │     is about the artist)
│                                                                  │     text-sm font-medium
│  (grid: 2 cols mobile, 3 cols md, 4 cols lg)                    │     text-xs text-muted-foreground
└──────────────────────────────────────────────────────────────────┘
```

**Fallback (no image):** Solid `bg-secondary/20` surface with artist initial letter centered, `text-6xl text-white/10 font-black`. Same gradient scrim overlay with name/stats.

**Animation:** Image fades up (`animate-fade-in-up`, 300ms). Name reveals after 120ms delay. Stats count up from 0 to actual value over 600ms using `useCountUp` hook. Song rows stagger `animate-fade-in-up` with 50ms increments per row.

**Empty songs:** "No songs yet." — `text-sm text-muted-foreground italic` centered in the songs section area.

#### Album Page Layout

```ascii
┌─ BackHeader (to="/home") ───────────────────────────────────────┐
│                                                                   │
│  ┌─────────────┐  ┌──────────────────────────────────────────┐   │
│  │ Album Cover   │  │ Album Title                             │   │  ← text-3xl font-extrabold
│  │ (320px sq)    │  │ text-foreground tracking-tight           │   │
│  │ rounded-2xl   │  │                                          │   │
│  │ border        │  │ by Artist Name                           │   │  ← Link to /artist/$slug
│  │ bg-raised     │  │ text-artist font-medium text-lg          │   │
│  │ object-cover  │  │                                          │   │
│  │ (mirrors      │  │ Album · 2024 · 12 tracks                 │   │  ← type badge: rounded-full
│  │  CoverArt)    │  │                                          │   │     px-2.5 py-0.5 text-xs
│  └─────────────┘  │  89 listens · 23 likes                     │   │     bg-white/10
│                   └──────────────────────────────────────────┘   │
│                                                                   │
│  Tracklist                                                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  #   Track                                  Listens        │  │  ← header: text-[11px]
│  │  ─   ─────────────────────────────────────  ───────        │  │     font-semibold uppercase
│  │  1   Shape of You                           247            │  │     tracking-wider
│  │  2   Castle on the Hill                     89             │  │     text-muted-foreground/60
│  │  3   Galway Girl                            156            │  │     border-b pb-2 mb-1
│  │  ...                                                        │  │
│  │  Track order is approximate until enriched                  │  │  ← footnote: text-[11px]
│  │  with metadata from MusicBrainz.                            │  │     text-muted-foreground/50
│  └────────────────────────────────────────────────────────────┘  │     italic mt-2
└──────────────────────────────────────────────────────────────────┘
```

**Tracklist rows:**
- Index column: 32px fixed width, `text-xs text-muted-foreground tabular-nums text-right pr-3`
- Title row: `text-sm font-medium text-foreground truncate`, artist as subtitle `text-xs text-muted-foreground truncate` (hidden if same as album artist)
- Listens column: right-aligned, `text-xs text-muted-foreground tabular-nums`
- Hover: `bg-white/[0.03]` on the row
- Click: navigates to `/song/$slug`
- Alternating subtle backgrounds: even rows get `bg-white/[0.015]` (barely perceptible, scanning aid for 20+ tracks)

**Mobile:** Single column — cover art 320px centered above header. Tracklist index column reduces to 24px. Title truncation tightens.

#### Accessibility Spec (Cross-Cutting)

| Requirement | Implementation |
|-------------|---------------|
| ARIA landmarks | `<main>` on page content, `<nav>` on BackHeader, `<section aria-label="Songs">` on song areas |
| Focus management | Search open → focus first hit. Search close → focus search input. Page nav → skip-to-content first. |
| Focus rings | `focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1` on all interactive elements |
| Touch targets | Minimum 44×44px on all interactive elements (search hits, buttons, tracklist rows) |
| Skip-to-content | `Skip to content` link as first focusable element, `sr-only focus:not-sr-only` |
| Screen reader labels | `aria-label="Search for songs, artists, albums"` on search. `aria-label="Songs by {artist}"` on song section. `aria-label="Tracklist for {album}"` on tracklist. |
| Search dropdown roles | `role="listbox"` on dropdown, `role="option"` on each hit, `aria-selected` on highlighted hit |
| Search toggle | `aria-expanded={open}` on search input/container |
| Reduced motion | `prefers-reduced-motion` → animations collapse to `0.01ms`, count-up stats render final value immediately |
| Color contrast | All text meets WCAG AA (4.5:1 for body, 3:1 for large text). Verify `text-muted-foreground` against `bg-popover/98` |

### VERDICT

**CODEX — Round 3 (Design).** 44 findings total (36 engineering + 8 design), all resolved in plan. The design review identified and resolved: information architecture (search keyboard nav, artist hierarchy), interaction states (partial results, error differentiation), emotional arc (staggered transitions, entry animations, stat count-up), AI slop risk (editorial hero layout instead of SaaS profile card), design system alignment (weight tokens, shape reuse), responsive behavior (full-width search on mobile, single-column page collapse), and full accessibility spec (ARIA, focus, touch targets, reduced motion). Design now has concrete visual hierarchy, transitional narrative, and a11y baked in — not "will polish later." The plan translates DESIGN.md tokens into pixel-level decisions: font weights (extrabold for destinations, semibold for UI), shape reuse (CoverArt→AlbumCover, SongHeader→ArtistHeader genre tags), motion (existing animate-scale-in extended to staggered sections, animate-fade-in-up for page entry). Total touch: ~22 files (4 migrations, 4 new routes/components dirs, 6 existing file modifications, 4 test files, 2 engagement RPCs, 1 index, 1 a11y hook).

NO UNRESOLVED DECISIONS
