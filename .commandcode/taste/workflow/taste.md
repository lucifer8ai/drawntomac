# workflow
- Follow git best practices: commit changes with meaningful commit messages, and update documentation when implementing features or making schema changes. Confidence: 0.70
- Discuss cross-cutting logic changes before implementing fixes — the user prefers to review the impact on other parts of the system before code gets written. Confidence: 0.65
- Prefer systemic root-cause fixes that prevent entire categories of bugs over per-artist/per-instance workarounds — fix the data pipeline, not individual entries. Confidence: 0.65
- When given the option to defer a quality/UX fix to a follow-up, prefer including it in the current PR — the user consistently chooses to fix things now rather than accumulate TODOs. This also applies to pre-existing bugs discovered during planning: analyze their impact and include the fix rather than marking them out of scope. Confidence: 0.80
- Split risky or independently-shippable features into separate PRs rather than bundling everything into one deployment — prefer smaller, safer ships. Confidence: 0.70
- When reviewing plans: cross-reference plan proposals against the actual codebase — read source files to verify assumptions rather than reviewing the plan in isolation. Plans that look correct on paper often contain hidden gaps revealed only by comparing against real code. Confidence: 0.70
- When reviewing plans, verify the fix doesn't alter overall site architecture — prefer minimal, targeted changes that preserve existing structural patterns rather than introducing new abstractions or type contracts that reshape how components communicate. Confidence: 0.75
- Test UI changes on localhost before committing — don't push and rely on Vercel deploy previews. Verify the changes work visually before they hit the branch. Confidence: 0.70
