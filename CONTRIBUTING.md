# Contributing

## Branch Naming

- `feat/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code improvements with no behavior change

Keep the base branch (`main`) in a working state. Always work on a feature branch and merge via PR.

## Commit Convention

Use concise, lowercase commit messages describing what changed and why:

```
feat: discover page with trending songs and compatible users
fix: profile picture upload RLS policy
refactor: use const instead of let for non-reassigned vars
```

## Before Submitting

```bash
npm run format   # Prettier auto-formatting
npm run lint     # ESLint check (0 errors required)
npx tsc --noEmit # TypeScript type-check
npm test         # 303 tests, all passing required
```

## Database Migrations

Migrations live in `supabase/migrations/` with timestamp-ordered filenames. To deploy:

```bash
npm run deploy-migrations
```

This runs all migrations against the Supabase project defined in your `.env.local`. You need `SUPABASE_SERVICE_ROLE_KEY` set in your environment for the deployer to work.

When adding new schema, follow the two-phase pattern for CHECK constraint additions:
1. Phase 1: Add new values (backward-compatible, keeps old ones)
2. Phase 2: Remove old values after code deploys

## Testing

Tests use Vitest + Testing Library + jsdom. Write tests for:
- New hooks with side effects (API calls, state management)
- New utility functions
- Components with conditional rendering branches

Run coverage to see what's tested:
```bash
npx vitest --coverage
```

## Design System

All visual decisions must align with `DESIGN.md`. It defines fonts, colors, spacing, and the aesthetic direction. Don't deviate without explicit approval. In reviews, flag any code that doesn't match.


