# ux
- Onboarding step 3 (ProfileStep: username, avatar, banner) is compulsory — no skip button. Step 4 (CityStep: city selection) is optional with a skip button. Confidence: 0.80
- Each song should be loggable only once per action type (heard/unheard toggle) — no multiple "heard" counts per song. Click to log, click again to unlog. Confidence: 0.85
- Avoid popup/notification modals when logging actions like "heard" or "want to hear" — prefer silent, inline confirmation. Confidence: 0.70
- Prefer like/dislike (binary sentiment) over 1-5 star ratings for song interactions — faster UX with zero cognitive overhead. Confidence: 0.70
- On the song page, Want-to-Hear is always visible (no Heard gate), while Like/Dislike and Review are gated behind Heard to preserve data authenticity. Confidence: 0.75
- Use lucide icons (not emojis) for action buttons — outline-only when inactive (gray #8A8276), filled with accent color when active. Confidence: 0.60
