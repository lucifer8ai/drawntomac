# skills
- Prefer global skill installation (~/.commandcode/skills/) over project-local (.commandcode/skills/) so skills are available across all projects and agents. Confidence: 0.65

# data-architecture
- Keep internal identifiers (slugs, primary keys) decoupled from external API identifiers (iTunes IDs, MusicBrainz MBIDs). Generate slugs from content (e.g., title + UUID prefix) rather than embedding source-specific IDs. Confidence: 0.65

# data-quality
- Prefer multi-axis ranking heuristics (e.g., status + date) over simpler single-dimension approaches when deduplicating or selecting from API results — data quality matters more than implementation simplicity. Confidence: 0.60

# workflow
- Follow git best practices: commit changes with meaningful commit messages, and update documentation when implementing features or making schema changes. Confidence: 0.70
- Discuss cross-cutting logic changes before implementing fixes — the user prefers to review the impact on other parts of the system before code gets written. Confidence: 0.60
- Prefer systemic root-cause fixes that prevent entire categories of bugs over per-artist/per-instance workarounds — fix the data pipeline, not individual entries. Confidence: 0.65
- When given the option to defer a quality/UX fix to a follow-up, prefer including it in the current PR — the user consistently chooses to fix things now rather than accumulate TODOs. Confidence: 0.70

# ux
- Each song should be loggable only once per action type (heard/unheard toggle) — no multiple "heard" counts per song. Click to log, click again to unlog. Confidence: 0.85
- Avoid popup/notification modals when logging actions like "heard" or "want to hear" — prefer silent, inline confirmation. Confidence: 0.70
- Prefer like/dislike (binary sentiment) over 1-5 star ratings for song interactions — faster UX with zero cognitive overhead. Confidence: 0.70
- On the song page, Want-to-Hear is always visible (no Heard gate), while Like/Dislike and Review are gated behind Heard to preserve data authenticity. Confidence: 0.75
- Use lucide icons (not emojis) for action buttons — outline-only when inactive (gray #8A8276), filled with accent color when active. Confidence: 0.60

# design
- Primary accent is neutral grey (oklch(0.85 0 0)), not blue. Action colors: red (like), green (heard), purple (want), blue (save), grey (dislike). Confidence: 0.70
- Respect the shape hierarchy: rounded-lg for buttons/inputs, rounded-full for badges/chips/avatars (pills are containers, not controls), rounded-2xl for cards. Confidence: 0.70
- Use DM Sans as the single, unified font family for all text — replace multi-family systems (Outfit, Instrument Serif, Bebas Neue, JetBrains Mono) with weight contrast (200-900) to carry hierarchy and register shifts. DM Sans is from Colophon Foundry, same DNA as Instagram Sans, open-source. Confidence: 0.80
- Embrace a dark, cinematic, editorial aesthetic: near-black dominant background with a single warm amber/gold accent glow, high contrast, minimal — letting content (album art, typography) carry the visual weight. Confidence: 0.70

# communication
- When presenting multiple options in planning questions, format them as numbered choices (1. Option A, 2. Option B, 3. Option C) so the user can respond with just the number. Confidence: 0.80

# supabase
- Use two-phase migrations when adding new values to diary_entries.type CHECK constraint: Phase 1 adds new types (backward-compatible, keeps old ones), Phase 2 removes old types after code deploys. Confidence: 0.65

