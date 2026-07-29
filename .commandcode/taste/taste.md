# skills
- Prefer global skill installation (~/.commandcode/skills/) over project-local (.commandcode/skills/) so skills are available across all projects and agents. Confidence: 0.65

# data-architecture
- Keep internal identifiers (slugs, primary keys) decoupled from external API identifiers (iTunes IDs, MusicBrainz MBIDs). Generate slugs from content (e.g., title + UUID prefix) rather than embedding source-specific IDs. Confidence: 0.65

# data-quality
- Prefer multi-axis ranking heuristics (e.g., status + date) over simpler single-dimension approaches when deduplicating or selecting from API results — data quality matters more than implementation simplicity. Confidence: 0.60
- When importing albums with multiple release versions (clean, explicit, hi-res), select the standard explicit version (not clean, not hi-res). When only a single release exists, import it as-is. Confidence: 0.70
- Store artists individually in the database — never as compound multi-artist strings (e.g., "Arjun, Mellow D & Lucky Ali"). Each artist gets their own row, and collaborations are modeled via the song_artists junction table. Single artist, no duplicacy. Confidence: 0.80

# workflow
- Follow git best practices: commit changes with meaningful commit messages, and update documentation when implementing features or making schema changes. Confidence: 0.70
- Discuss cross-cutting logic changes before implementing fixes — the user prefers to review the impact on other parts of the system before code gets written. Confidence: 0.60
- Prefer systemic root-cause fixes that prevent entire categories of bugs over per-artist/per-instance workarounds — fix the data pipeline, not individual entries. Confidence: 0.65
- When given the option to defer a quality/UX fix to a follow-up, prefer including it in the current PR — the user consistently chooses to fix things now rather than accumulate TODOs. Confidence: 0.70

# ux
See [ux/taste.md](ux/taste.md)
# design
- Primary accent is neutral grey (oklch(0.85 0 0)), not blue. Action colors: red (like), green (heard), purple (want), blue (save), grey (dislike). Confidence: 0.70
- Respect the shape hierarchy: rounded-lg for buttons/inputs, rounded-full for badges/chips/avatars (pills are containers, not controls), rounded-2xl for cards. Confidence: 0.70
- Use DM Sans as the single, unified font family for all text — replace multi-family systems (Outfit, Instrument Serif, Bebas Neue, JetBrains Mono) with weight contrast (200-900) to carry hierarchy and register shifts. DM Sans is from Colophon Foundry, same DNA as Instagram Sans, open-source. Confidence: 0.80
- Embrace a dark, cinematic, editorial aesthetic: near-black dominant background with a single warm amber/gold accent glow, high contrast, minimal — letting content (album art, typography) carry the visual weight. Confidence: 0.70
- On the sign-in page: keep it ultra-minimal — full-bleed background image and the auth toggle/card only, no logo, no tagline, no brand text. Confidence: 0.70

# communication
- When presenting multiple options in planning questions, format them as numbered choices (1. Option A, 2. Option B, 3. Option C) so the user can respond with just the number. Confidence: 0.80
- When presenting design alternatives (library choices, UX flows, architecture approaches), make the best-UX decision autonomously and explain the reasoning — don't ask the user to pick between options. The user trusts the assistant's judgment on what delivers the best user experience. Confidence: 0.65
- Before implementing complex multi-step changes, confirm understanding by restating the approach back to the user and wait for explicit approval — don't jump straight into code. Confidence: 0.70

# supabase
- Use two-phase migrations when adding new values to diary_entries.type CHECK constraint: Phase 1 adds new types (backward-compatible, keeps old ones), Phase 2 removes old types after code deploys. Confidence: 0.65

# architecture
- Song search should query the local DB first, then when local results are insufficient, call MusicBrainz and Genius APIs in parallel (not sequentially) — DB first, then both external APIs together. Confidence: 0.70
- Prefer dropping unnecessary complexity when a simpler approach emerges — if existing infrastructure already solves the problem, don't add a new layer. The existing `songs` table IS the cache; a separate `search_cache` table adds coordination overhead for no benefit. Confidence: 0.70
- When creating new detail page routes (album, artist, song), mirror existing route patterns: same Shell component (sticky header with #d.To logo and Back link), same loader/errorComponent/notFoundComponent structure, same head with dynamic OG meta. Don't invent new structural patterns. Confidence: 0.70
- Genius API is for artwork enrichment only — use it to fetch thumbnail images for existing search results, not as an independent source of song titles, artist names, or search result entries. Genius hits should not appear as standalone search results. Confidence: 0.80

