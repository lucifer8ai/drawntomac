# Admin Login: Third Option on Sign Page

**Branch:** `feat/discover-page`
**Goal:** Add a third "Admin" option to the sign page that authenticates the single admin and lands directly on `/admin`, with no breakage to sign up, sign in, Google OAuth, or the existing `/admin` and `/api/admin/*` security layers.

---

## Decisions locked with user

| Decision | Choice |
|----------|--------|
| Admin UI | Third toggle tab: Sign up / Sign in / Admin |
| Non-admin behavior | Show "Not authorized" error and stay on sign page |
| Verification location | Server-side in `/api/auth/signin` (checks `is_admin`) |
| Onboarding for admins | Admins skip onboarding; reorder `/admin` guard to check `is_admin` first |
| Single admin | Idempotent reset migration + trigger that blocks authenticated `is_admin` self-promotion |
| Admin password | One-off env-var script: `ADMIN_PASSWORD=Rag@249$` via `auth.admin`, secret never committed |

---

## Current architecture

```
src/routes/index.tsx
  ├── AuthForm
  │     mode: "signup" | "signin"
  │     handleSubmit → POST /api/auth/signup | /api/auth/signin
  │     establishSession(body) → setSession → navigate("/home")
  └── AuthPage
        onAuthStateChange(SIGNED_IN / INITIAL_SESSION) → navigate("/home")

src/routes/api/auth/signin.ts
  validate → rate-limit → resolve email → passwordSignIn(anonClient)
  → returns { session, user }

src/routes/api/auth/signup.ts
  create user → passwordSignIn(anonClient) → returns { session, user }

src/routes/admin/route.tsx  (beforeLoad)
  getUser → select(is_admin, onboarding_completed)
  → !onboarding_completed → /onboarding
  → !is_admin → /home
```

Two security layers exist and must both stay intact:

1. `/admin` route `beforeLoad` rejects non-admins (client-side gate).
2. Every `/api/admin/*` handler independently re-verifies `is_admin` server-side via `supabaseAdmin`.

The admin seed already exists in `supabase/migrations/20260729000004_add_admin_role.sql`, which grants `is_admin = true` to `yrkgkp1@gmail.com`.

---

## Data flow

```
Admin tab selected
        │
        ▼
  POST /api/auth/signin
  { identifier, password, adminOnly: true }
        │
        ▼
  passwordSignIn(anonClient)        ← unchanged
        │  success
        ▼
  isUserAdmin(supabaseAdmin, userId)
        │
        ├─ false → 403 { error: "This account isn't an admin." }
        │          (client shows toast, stays on sign page)
        │
        └─ true  → 200 { session, user }
                    │
                    ▼
        establishSession(body, "/admin")
                    │
                    ├─ set navIntent = "/admin"
                    ├─ supabase.auth.setSession(...)   ← fires SIGNED_IN
                    │
                    ▼
        AuthPage listener reads navIntent → navigate("/admin")
        establishSession fallback → navigate("/admin")
                    │
                    ▼
        /admin beforeLoad re-checks is_admin → renders AdminLayout
```

### Sign-page auto-redirect race

`AuthPage` registers an `onAuthStateChange` listener that navigates to `/home` on any `SIGNED_IN` event. `supabase.auth.setSession` fires `SIGNED_IN`, so the listener and the form flow would disagree on the destination for the admin path. The fix is a navigation-intent ref so both navigations agree:

```
AuthPage navIntent ref: "/home" | "/admin"  (default "/home")
AuthForm.establishSession(body, destination):
    onNavIntent(destination)        // before setSession
    await supabase.auth.setSession(...)
    navigate(destination)           // explicit fallback

AuthPage listener (SIGNED_IN / INITIAL_SESSION):
    dest = navIntent.current
    navIntent.current = "/home"     // reset for next use
    navigate(dest)
```

This keeps existing navigation reliable, makes the listener target-aware, and leaves Google OAuth (`/auth/callback`) untouched because it never sets `navIntent`.

---

## Files to modify

| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add `isUserAdmin(admin, userId)` helper |
| `src/routes/api/auth/signin.ts` | Accept optional `adminOnly`; gate on `is_admin`; return 403 when not admin |
| `src/routes/index.tsx` | Add `admin` mode, third tab, conditional labels/endpoints, nav-intent handling |
| `src/routes/admin/route.tsx` | Reorder guard: check `is_admin` before `onboarding_completed` |
| `supabase/migrations/20260825000000_enforce_single_admin.sql` | NEW — reset all admins, grant only `yrkgkp1@gmail.com` |
| `supabase/migrations/20260825000001_block_admin_self_promotion.sql` | NEW — trigger rejects authenticated `is_admin` changes |
| `scripts/set-admin-password.ts` | NEW — one-off env-var script to set admin password |
| `tests/lib/auth.test.ts` | Add `isUserAdmin` unit tests |
| `tests/routes/api/signin-admin.test.ts` | NEW — route-level admin gate + no-regression tests |

9 files, 2 new functions, 2 migrations, 1 script, 1 trigger. No new classes/services, no new dependencies, no new artifact type.

---

## Detailed changes

### 1. `src/lib/auth.ts` — add `isUserAdmin`

```ts
export async function isUserAdmin(
  admin: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  return profile?.is_admin === true;
}
```

Mirrors the exact check already inlined in the six `/api/admin/*` handlers. Kept as a helper so it is unit-testable and reusable.

### 2. `src/routes/api/auth/signin.ts` — `adminOnly` gate

Add to `bodySchema`:

```ts
adminOnly: z.boolean().optional(),
```

After the existing `passwordSignIn` success check, before returning:

```ts
const { identifier, password, adminOnly } = parsed.data;

// ... existing validation, rate-limit, resolve, signIn ...

if (adminOnly) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const isAdmin = await isUserAdmin(supabaseAdmin, result.user.id);
  if (!isAdmin) {
    return Response.json(
      { error: "This account isn't an admin." },
      { status: 403 },
    );
  }
}

return Response.json({ session: result.session, user: result.user });
```

`client.server` is already dynamically imported earlier for username resolution, so the email sign-in path sees no new import cost. When `adminOnly` is absent or `false`, the existing path is byte-for-byte unchanged.

### 3. `src/routes/index.tsx` — third mode + nav intent

`AuthForm`:

- `mode` type becomes `"signup" | "signin" | "admin"`.
- Toggle renders `["signup", "signin", "admin"]`, container becomes `grid-cols-3`.
- Tab labels: Sign up / Sign in / Admin.
- Input label: `mode === "signup" ? "Email" : "Email or username"`.
- Input type: `mode === "signup" ? "email" : "text"`.
- Input autocomplete: `mode === "signup" ? "email" : "username"`.
- Password autocomplete: `mode === "signup" ? "new-password" : "current-password"`.
- Forgot password stays gated to `mode === "signin"`.
- Submit label: `mode === "signup" ? "Join the wall" : mode === "admin" ? "Enter admin" : "Come in"`.
- `handleSubmit`:
  - endpoint: signup → `/api/auth/signup`; otherwise `/api/auth/signin`.
  - payload: signup `{ email, password }`; admin `{ identifier: email, password, adminOnly: true }`; signin `{ identifier: email, password }`.
  - destination: `mode === "admin" ? "/admin" : "/home"`.
- `establishSession(body, destination)`:
  - accepts a destination argument
  - calls `onNavIntent(destination)` before `setSession`
  - keeps the explicit `navigate(destination)` fallback

`AuthPage`:

- Add `const navIntent = useRef<"/home" | "/admin">("/home")`.
- Change the `onAuthStateChange` listener to read `navIntent.current`, reset to `"/home"`, then navigate.
- Pass `onNavIntent` into `<AuthForm />`.

### 4. `src/routes/admin/route.tsx` — reorder guard

```ts
if (!profile?.is_admin) throw redirect({ to: "/home" });
if (!profile?.onboarding_completed) throw redirect({ to: "/onboarding" });
```

Admins bypass onboarding. A non-admin with incomplete onboarding who manually visits `/admin` now goes to `/home`, then `_authenticated` bounces them to `/onboarding` — no regression.

### 5. `supabase/migrations/20260825000000_enforce_single_admin.sql` — NEW

```sql
-- Enforce a single admin. Idempotent: safe to run repeatedly.
UPDATE public.profiles SET is_admin = false;

UPDATE public.profiles
SET is_admin = true,
    onboarding_completed = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'yrkgkp1@gmail.com'
);
```

Notes:

- The migration deployer only runs new files, so this must be a new timestamped file, not an edit to `20260729000004`.
- The `handle_new_user` trigger creates a `profiles` row for every `auth.users` row, so the admin profile exists before this runs. If the profile were ever missing, the script in step 7 creates the user (which fires the trigger) before the migration grant.
- `onboarding_completed = true` is set here so the admin skips onboarding at the data level, consistent with the reordered guard.

### 6. `supabase/migrations/20260825000001_block_admin_self_promotion.sql` — NEW

This is the fix for a real security hole found in the blast-radius analysis. The current `profiles` RLS policy is:

```sql
CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

Nothing prevents an authenticated user from sending:

```
supabase.from("profiles").update({ is_admin: true }).eq("id", <their id>)
```

The reset migration alone would be immediately undoable. The fix is a `BEFORE UPDATE` trigger that rejects any `is_admin` change from client requests while allowing service-role operations (the reset migration and password script run with the service role).

```sql
CREATE OR REPLACE FUNCTION public.block_admin_self_promotion()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin
     AND coalesce(current_setting('request.jwt.claims', true), '{}')::json ->> 'role'
         IS DISTINCT FROM 'service_role'
  THEN
    RAISE EXCEPTION 'is_admin cannot be changed by client requests';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_admin_self_promotion
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.block_admin_self_promotion();
```

Why `request.jwt.claims ->> 'role'`:

- Authenticated client requests carry `role = authenticated` in the JWT, so they hit the exception.
- Service-role clients (scripts, migrations, `client.server.ts`) carry `role = service_role`, so they are allowed.
- A request with no JWT (outside PostgREST) has `current_setting` returning `null`, which maps to `'{}'` and is therefore blocked — fail closed.

### 7. `scripts/set-admin-password.ts` — NEW

One-off, env-var driven. The plaintext password never enters git.

Environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL=yrkgkp1@gmail.com`
- `ADMIN_PASSWORD=Rag@249$`

Steps:

1. Build a service-role client from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
2. `auth.admin.listUsers()`, find the user whose `email` equals `ADMIN_EMAIL`.
3. If found → `auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD })`.
4. If not found → `auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true })`. The `handle_new_user` trigger creates the matching profile.
5. Defense in depth → `from("profiles").update({ is_admin: true, onboarding_completed: true }).eq("id", user.id)`. The service role passes the new trigger.
6. Log success without echoing the password.

Run once:

```bash
ADMIN_EMAIL='yrkgkp1@gmail.com' ADMIN_PASSWORD='Rag@249$' npx tsx scripts/set-admin-password.ts
```

The single quotes prevent `$` from being expanded by the shell.

### 8. Tests

`tests/lib/auth.test.ts` — add `isUserAdmin` cases:
- returns `true` when `profile.is_admin === true`
- returns `false` when `profile.is_admin === false`
- returns `false` when `maybeSingle` resolves `data: null`

`tests/routes/api/signin-admin.test.ts` — new route-level tests, following the `tests/routes/api/upload.test.ts` mock pattern:
- `adminOnly: true` + non-admin → `403`, body error
- `adminOnly: true` + admin → `200`, body contains `session`
- `adminOnly` omitted → normal sign-in path unchanged (`200`) — explicit no-regression check

Mocks required:
- `@/lib/auth` (passwordSignIn, validateSigninInput, normalizeIdentifier, extractClientIp, resolveUserEmail, isUserAdmin)
- `@/lib/rate-limiter` (`checkRateLimit` → `true`)
- `@/integrations/supabase/client.server` (`supabaseAdmin`)
- `@/integrations/supabase/anon.server` (`supabaseAnonServer`)

---

## Blast radius analysis (exhaustive, evidence-backed)

The search was run across `src/` and `supabase/migrations/`. This is the complete consumer map for every symbol the plan touches, plus the data-layer grant paths that affect the single-admin guarantee.

### 1. `is_admin` consumers (all occurrences in `src/`)

| File | Usage | Impact of this plan |
|------|-------|---------------------|
| `src/routes/admin/route.tsx` | `select("is_admin, onboarding_completed")` + two redirect checks | Modified: reorder only; non-admin redirect unchanged |
| `src/routes/api/admin/upload-artwork.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/routes/api/admin/update-release-group.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/routes/api/admin/update-song.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/routes/api/admin/update-song-artists.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/routes/api/admin/update-artist.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/routes/api/admin/search-entities.ts` | `select("is_admin")`, `if (!profile?.is_admin) 403` | Unchanged |
| `src/lib/types.ts` | `is_admin: boolean` (Row) / `is_admin?: boolean` (Insert/Update) | Unchanged; already present |

All six `/api/admin/*` handlers keep their server-side check. The trigger does not affect read paths.

### 2. `onboarding_completed` consumers (all occurrences in `src/`)

| File | Usage | Impact of this plan |
|------|-------|---------------------|
| `src/routes/admin/route.tsx` | `select("is_admin, onboarding_completed")`, redirect if false | Modified: reorder only |
| `src/routes/_authenticated/route.tsx` | `select("onboarding_completed")`, redirect to `/onboarding` | Unchanged |
| `src/routes/onboarding.tsx` | `select("onboarding_completed, onboarding_step")`, redirect to `/home` if completed | Unchanged |
| `src/components/onboarding/CityStep.tsx` | writes `onboarding_completed: true` | Unchanged |
| `src/lib/types.ts` | column type | Unchanged |
| `tests/routes/onboarding-redirect.test.tsx` | logic-only assertions | Unchanged |
| `tests/components/OnboardingCityStep.test.tsx` | asserts `onboarding_completed` true | Unchanged |

The reorder only changes the admin route. The `_authenticated` layout still catches non-admin, incomplete-onboarding users. Onboarding components still write `onboarding_completed` for normal users; the trigger only guards `is_admin`, not `onboarding_completed`.

### 3. `profiles` write paths (grant + RLS + trigger interaction)

| Path | Grants | RLS policy | `is_admin` risk |
|------|--------|-----------|-----------------|
| Client (`src/integrations/supabase/client.ts`) | `authenticated` role | `users update own profile` | **Risk before trigger:** can set `is_admin` on own row |
| Service role (`src/integrations/supabase/client.server.ts`) | `service_role` role | bypasses RLS | Intended: migrations + password script set `is_admin` |
| `src/hooks/useProfile.ts` | authenticated | own row only | Updates profile fields, not `is_admin` |
| `src/components/onboarding/CityStep.tsx` | authenticated | own row only | Writes `onboarding_completed`, not `is_admin` |
| `src/components/onboarding/ProfileStep.tsx` | authenticated | own row only | Writes profile fields, not `is_admin` |

**Closing the hole:** the new `trg_block_admin_self_promotion` trigger makes the client path reject any `is_admin` change. Service-role scripts still pass. This is the only correct way to enforce "only `yrkgkp1@gmail.com`" without breaking the existing `useProfile` / onboarding writes.

### 4. Session-setting flows (the sign-page race surface)

| File | Symbol | Impact |
|------|--------|--------|
| `src/routes/index.tsx` `establishSession` | `supabase.auth.setSession` | Modified to accept destination; `/home` stays default |
| `src/routes/index.tsx` `AuthPage` | `onAuthStateChange` | Modified to read `navIntent`, reset to `/home` |
| `src/routes/auth/callback.tsx` | `onAuthStateChange` + `navigate("/home")` | Unchanged; Google OAuth never sets `navIntent` |
| `src/routes/api/auth/signin.ts` | `passwordSignIn` | Unchanged for `adminOnly` absent/false |
| `src/routes/api/auth/signup.ts` | `passwordSignIn` | Unchanged |
| `src/components/profile/AccountSettings.tsx` | `passwordSignIn` | Unchanged; uses its own ephemeral client for reauth |

No other code sets the app session from a password form, so no other destination path needs the intent ref.

### 5. `passwordSignIn` consumers (all occurrences in `src/`)

| File | Impact |
|------|--------|
| `src/routes/api/auth/signin.ts` | Existing call unchanged; gate added after |
| `src/routes/api/auth/signup.ts` | Unchanged |
| `src/components/profile/AccountSettings.tsx` | Unchanged; ephemeral client reauth |

The helper's signature and behavior are untouched. Adding `isUserAdmin` is a pure addition.

### 6. Route registration

`src/routeTree.gen.ts` already declares both `/api/auth/signin` and `/api/auth/signup`. No new route is introduced. The generated file must not be hand-edited; it regenerates on build. No action.

### 7. Database migrations

| File | Action |
|------|--------|
| `20260729000004_add_admin_role.sql` | Not edited. Superseded by reset migration. |
| `20260729000005_add_admin_audit_log.sql` | Not edited. Its `is_admin` check continues to work. |
| `20260825000000_enforce_single_admin.sql` | NEW, idempotent reset + single grant |
| `20260825000001_block_admin_self_promotion.sql` | NEW, closes the self-promotion hole |

### 8. Generated artifacts

`dist/`, `.vercel/output/`, `.output/`, `.tanstack/tmp/` are build outputs. They regenerate on the next build and are never hand-edited. The grep results from these directories are stale build snapshots and are not source. No action.

---

## Edge cases

1. **Non-admin uses Admin tab** — server returns `403`; client shows toast and stays on sign page. No session established.
2. **Admin uses Admin tab** — `200`, session set, lands on `/admin`.
3. **Admin hasn't completed onboarding** — `/admin` guard checks `is_admin` first, plus the migration sets `onboarding_completed = true`. Admin bypasses onboarding.
4. **Non-admin with incomplete onboarding hits `/admin` manually** — reordered guard sends to `/home`, then `_authenticated` sends to `/onboarding`. Behavior preserved.
5. **`setSession` fires `SIGNED_IN`** — nav-intent ref makes the listener navigate to the correct destination; no `/home` vs `/admin` race.
6. **`setSession` fails** — toast error, stay; `navIntent` is overwritten on the next submit.
7. **Normal sign in / sign up** — destination stays `/home`; behavior unchanged.
8. **Google OAuth** — uses `/auth/callback` and never touches `navIntent`; unaffected.
9. **Direct `/admin` visit by a signed-in non-admin** — existing guard still bounces to `/home`. Unchanged.
10. **Multiple admins somehow exist** — reset migration clears all but `yrkgkp1@gmail.com`.
11. **Admin auth user missing** — password script creates the user first (trigger creates the profile), then migration grants admin.
12. **Password contains `$`** — single-quoted env var prevents shell expansion; the script never logs it.
13. **Authenticated user tries self-promotion** — new trigger raises an exception, so `is_admin` stays false. `useProfile` and onboarding writes (which don't touch `is_admin`) still pass.
14. **Service-role script/migration sets `is_admin`** — `role = service_role` in the JWT bypasses the trigger, so reset and password script succeed.
15. **Direct SQL / dashboard edit** — outside PostgREST with no JWT → trigger blocks (fail closed). Use the service role or a new migration for legitimate changes.

---

## What's NOT changed

- Google OAuth flow.
- Sign up and normal sign in behavior.
- Existing `/api/admin/*` server-side auth checks (no weakening; they become redundant with the trigger, not replaced).
- Already-signed-in users landing on `/` still redirect to `/home` (unchanged; not in scope).
- `profiles` schema columns (`is_admin`, `onboarding_completed` already exist).
- No new dependency.

---

## Verification

1. `npx vitest run tests/lib/auth.test.ts` — `isUserAdmin` tests pass.
2. `npx vitest run tests/routes/api/signin-admin.test.ts` — route gate + no-regression tests pass.
3. `npx vitest run` — full suite green.
4. `npx tsc --noEmit` — no type errors.
5. `npm run lint` — clean.
6. Deploy new migrations: `npx tsx scripts/deploy-migrations.ts` — verify both `20260825000000` and `20260825000001` succeed.
7. Run password script once with env vars.
8. Manual: non-admin + Admin tab → toast "This account isn't an admin.", stays on sign page.
9. Manual: `yrkgkp1@gmail.com` + `Rag@249$` on Admin tab → lands on `/admin` (admin dashboard).
10. Manual: normal sign in → `/home`; sign up → `/home`; Google → `/home`.
11. Manual: direct `/admin` as a signed-in non-admin → redirected to `/home`.
12. Manual: signed-in non-admin runs `supabase.from("profiles").update({ is_admin: true }).eq("id", ownId)` in browser console → RPC returns the trigger exception, flag stays false.
13. Manual: confirm no other account is admin in Supabase dashboard after migration.

## GSTACK REVIEW REPORT

| Runs | Status | Findings |
|---|---|---|
| Architecture | PASS | Reuses `/api/auth/signin`, adds `isUserAdmin`, keeps `/admin` + `/api/admin/*` security layers intact. Single admin enforced at the data layer by reset migration plus a self-promotion-blocking trigger; password via env-var script so the secret stays out of git. |
| Code Quality | PASS | Small, mechanical changes. Nav-intent ref removes a real `/home` vs `/admin` race. One pure, testable helper. No new abstraction or dependency. |
| Tests | PASS | Unit tests for `isUserAdmin`, route-level tests for the `adminOnly` gate, and an explicit `adminOnly`-omitted no-regression test. Trigger behavior verified manually (step 12). |
| Performance | PASS | One extra `profiles.is_admin` query only on admin login; normal sign-in path unchanged. The trigger adds a constant-time JWT check on profile updates only. |

VERDICT: PROCEED. The plan adds a third admin tab, gates it server-side on `is_admin`, fixes the sign-page auto-redirect race, and closes the authenticated self-promotion hole so `yrkgkp1@gmail.com` is the only admin. The admin password is set through a one-off env-var script without committing the secret.

NO UNRESOLVED DECISIONS
