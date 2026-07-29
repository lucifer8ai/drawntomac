# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in `src/routes/`
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File                     | URL                                                     |
| ------------------------ | ------------------------------------------------------- |
| `index.tsx`              | `/`                                                     |
| `about.tsx`              | `/about`                                                |
| `users/index.tsx`        | `/users`                                                |
| `users/$id.tsx`          | `/users/:id` (dynamic — bare `$`, no curly braces)      |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment)                  |
| `files/$.tsx`            | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx`            | layout route (renders children via `<Outlet />`)        |
| `__root.tsx`             | app shell — wraps every page; preserve `<Outlet />`     |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## App Route Map

```
src/routes/
├── __root.tsx                          →  /  (root shell)
├── index.tsx                           →  /  (auth/landing page)
├── song.$slug.tsx                      →  /song/$slug
├── _authenticated/
│   ├── route.tsx                       →  layout (auth guard + tab state)
│   ├── home.tsx                        →  /home (feed/diary/discover)
│   └── user.$username.tsx              →  /user/$username (public profile)
├── auth/
│   └── callback.tsx                    →  /auth/callback (OAuth handler)
└── api/
    ├── import.ts                       →  /api/import (POST)
    ├── search.ts                       →  /api/search (GET)
    └── upload.ts                       →  /api/upload (POST, DELETE)
```

### Naming Conventions

| Convention            | Meaning                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `$slug` / `$username` | Dynamic path segment (e.g. `/song/bohemian-rhapsody`, `/user/alice`)                         |
| `_authenticated`      | **Layout route** — prefix with `_` means it nests children without appearing in the URL path |
| `.tsx` extension      | Page route (client render + server loader)                                                   |
| `.ts` extension       | API route (server-only handler)                                                              |

### `_authenticated` Layout

The `/home` and `/user/$username` routes are nested under `_authenticated`. This layout:

- Guards against unauthenticated access (redirects to `/`)
- Provides `TabContext` with `activeTab`, `setTab`, `discoverSection`, and `setDiscoverSection`
- Renders `AppHeader` (top nav), `BottomNav` (mobile tab bar), and `ProfileSheet` (own profile drawer)

### `TabContext`

The tab state (`"feed" | "diary" | "discover"`) is managed as React state in the
`_authenticated` layout, not URL-encoded. Components use `useTabContext()` to read
and set the active tab. The `setTab` function also navigates to `/home` if needed.

### Search Params

The `/user/$username` route accepts optional search params:

- `from`: `"feed"` | `"diary"` | `"discover"` — encodes origin tab for contextual back navigation
- `section`: `"trending"` | `"people"` — encodes origin discover section
