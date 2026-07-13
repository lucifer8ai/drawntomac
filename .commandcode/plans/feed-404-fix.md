# Plan: Feed Page 404 — `get_feed` RPC Not Deployed

## Branch
`feat/discover-page`

## Problem
The feed page shows an error. Console shows:
```
POST https://doiasywmcaxqlzgghrci.supabase.co/rest/v1/rpc/get_feed → 404
```

## Root Cause

```
useFeed.ts — supabase.rpc("get_feed", ...)
  → POST /rest/v1/rpc/get_feed
  → Supabase returns 404: function not found

Migration file exists locally:
  supabase/migrations/20260711000007_get_feed_rpc.sql ← ON DISK, NOT DEPLOYED

Supabase project: doiasywmcaxqlzgghrci
  → get_feed function does not exist on the server
```

The `get_feed` RPC SQL exists and is syntactically correct. It was never pushed to Supabase. The client code calls it unconditionally with no fallback.

Other migrations from the same batch (discover RPCs, compatibility functions, indexes) may also be undeployed, which means the Discover page breaks silently or will break when its RPCs are called.

## Systemic Gap

- No CI/CD pipeline for migration deployment
- Existing `scripts/run-migration.ts` is hardcoded to deploy a single specific migration
- No tracking of which migrations have been deployed
- 23 migration files total — no way to know which are live on Supabase

## Changes

### 1. Immediate Fix — Deploy `get_feed` via SQL Editor

The fastest path: open Supabase Dashboard → SQL Editor → paste migration SQL → run.

`20260711000007_get_feed_rpc.sql` uses `CREATE OR REPLACE FUNCTION` — idempotent, safe.

### 2. Universal Migration Deployer Script

**New file**: `scripts/deploy-migrations.ts`

Replace the hardcoded `scripts/run-migration.ts` with a generic deployer.

Strategy: Use the Supabase service role key to create an `exec_sql` RPC bridge, then run all `.sql` files through it.

**Step 2a**: Deploy the `exec_sql` bridge function once (via SQL Editor):

```sql
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE query;
END;
$$;
```

**Step 2b**: The deployer script:

```ts
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, existsSync, appendFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const MIGRATIONS_DIR = resolve(import.meta.dirname, "../supabase/migrations");
const DEPLOYED_FILE = resolve(import.meta.dirname, "../supabase/.deployed-migrations");

function getDeployed(): Set<string> {
  try {
    return new Set(readFileSync(DEPLOYED_FILE, "utf-8").split("\n").filter(Boolean));
  } catch {
    return new Set();
  }
}

function markDeployed(file: string) {
  appendFileSync(DEPLOYED_FILE, file + "\n");
}

async function main() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const deployed = getDeployed();
  let failed = false;

  for (const file of files) {
    if (deployed.has(file)) {
      console.log(`\u2022 ${file} (already deployed)`);
      continue;
    }

    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf-8");
    const { error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();

    if (error) {
      console.error(`\u2717 ${file}: ${error.message}`);
      failed = true;
      break;
    }

    console.log(`\u2713 ${file}`);
    markDeployed(file);
  }

  if (failed) {
    console.error("\nMigration failed. Fix the error and re-run.");
    process.exit(1);
  }

  console.log("\nAll migrations deployed.");
}

main();
```

### 3. NPM Script

**File**: `package.json` — add to scripts:

```json
"deploy-migrations": "npx tsx scripts/deploy-migrations.ts"
```

### 4. Developer Diagnostics in useFeed

**File**: `src/hooks/useFeed.ts`

Add a clear developer-facing error when the RPC isn't found:

```ts
const { data, error: rpcError } = await supabase.rpc("get_feed", { ... });

if (rpcError) {
  if (rpcError.code === "PGRST202" || rpcError.message?.includes("function") || rpcError.message?.includes("not found")) {
    const err = new Error("get_feed function not deployed. Run: npx tsx scripts/deploy-migrations.ts");
    throw err;
  }
  throw rpcError;
}
```

Users still see the same error state + retry button. Developers get diagnostic guidance.

### 5. Tests

**New file**: `tests/hooks/useFeed.test.ts`

```ts
// Feed shows error state when get_feed returns 404
mockRpc.mockRejectedValueOnce({
  message: "Could not find the function public.get_feed in the schema cache",
  code: "PGRST202",
});

render(<FeedPage />);
await waitFor(() => screen.getByText(/Something went wrong/));
expect(screen.getByText("Try again")).toBeTruthy();
```

Covers: error state, retry button, empty state (0 following), skeleton during load.

---

## Files Changed

| File | Change |
|------|--------|
| `scripts/deploy-migrations.ts` | **NEW** — generic migration deployer with tracking |
| `scripts/run-migration.ts` | **DELETE** — replaced |
| `package.json` | Add `"deploy-migrations"` script |
| `src/hooks/useFeed.ts` | Add developer diagnostic for RPC-not-found |
| `tests/hooks/useFeed.test.ts` | **NEW** — feed error + retry tests |

## Verification

1. Deploy `exec_sql` bridge via SQL Editor (one-time)
2. `npm run deploy-migrations` → deploys all pending migrations including `get_feed`
3. Open app → feed page loads (no 404)
4. `npm run deploy-migrations` again → all files show "(already deployed)"
5. `bun test` → all tests pass

## GSTACK REVIEW REPORT

| Runs | Status | Findings |
|------|--------|----------|
| Architecture | ✅ | 1 issue: local SQL files not synced to Supabase — no deployment pipeline |
| Code Quality | ✅ | 2 issues: hardcoded migration path, no developer-facing diagnostic |
| Tests | ✅ | 1 issue: no test coverage for feed error state |
| Performance | ✅ | N/A |

**VERDICT**: The feed 404 is a deployment gap, not a code bug. `get_feed` SQL is correct. Fix: (1) deploy the missing RPC via SQL Editor, (2) build a universal migration deployer with tracking so this class of bug never recurs, (3) add dev diagnostics so future RPC-not-found errors tell developers exactly what to do.

NO UNRESOLVED DECISIONS
