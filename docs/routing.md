# Routing Standards

## Route structure

- **All application routes live under `/dashboard`.** Every feature page is a sub-route of `/dashboard` (e.g. `/dashboard`, `/dashboard/workouts/[id]`, `/dashboard/settings`) — never a new top-level route.
- The only routes allowed outside `/dashboard` are:
  - `/` — the public landing page, which links/redirects users into `/dashboard`
  - `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]` — Clerk auth pages
- Do not add other top-level routes. If a screen doesn't fit under `/dashboard`, that's a design smell — raise it rather than working around it.

```
src/
  app/
    page.tsx                        // public landing page
    sign-in/[[...sign-in]]/page.tsx // public — Clerk
    sign-up/[[...sign-up]]/page.tsx // public — Clerk
    dashboard/
      page.tsx                      // protected
      workouts/[id]/page.tsx        // protected (example sub-page)
```

- New pages and layouts must use the generated typed-route props (`PageProps<"/dashboard/workouts/[id]">`, `LayoutProps<"/dashboard">`) instead of hand-written prop interfaces — see `CLAUDE.md`.

## Route protection

- **`/dashboard` and every sub-route of it is a protected route: only signed-in users may access it.** Unauthenticated requests must never render a dashboard page — they are redirected to sign-in before the route renders.
- **Protection is enforced in the Next.js middleware layer.** In Next.js 16 the middleware file convention has been renamed to `proxy.ts` — this project's middleware lives at `src/proxy.ts` (there is no `middleware.ts`; do not create one). All middleware guidance in older docs/tutorials applies to `proxy.ts` unchanged.
- Use Clerk's `clerkMiddleware` with `createRouteMatcher` and `auth.protect()`. The canonical shape:

```ts
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});
```

- Match protected routes with the `"/dashboard(.*)"` pattern so the dashboard root **and all current and future sub-pages** are covered automatically — never enumerate individual dashboard sub-routes in the matcher, which silently leaves new pages unprotected.
- Any future API routes serving the app (`/api/...`) that touch user data must be protected the same way — add them to the protected matcher rather than checking auth ad hoc inside the handler.

## Middleware is the gate, not the only check

- The proxy-level guard is the required outer gate, but it is **not** a substitute for server-side auth in data access: every `/data` helper still derives the user via `auth.protect()` and scopes queries by `userId` (see `docs/data-fetching.md`). Defense in depth — a misconfigured matcher must not become a data leak.
- Never gate access on the client (hiding links, `useUser()` checks, client redirects). Client checks are UX sugar at most; authorization decisions happen in `proxy.ts` and in the `/data` layer.

## Why

Keeping every app screen under `/dashboard` gives one URL namespace to protect, so a single `"/dashboard(.*)"` matcher in `src/proxy.ts` covers the whole authenticated app — new pages are born protected instead of each one remembering to add its own guard.
