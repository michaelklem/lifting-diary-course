# Data Fetching Standards

## Where fetching happens

- **All data fetching must happen in Server Components.** Route (page/layout) components fetch their own data directly in the component body via `async`/`await` — this is the only place data fetching is allowed to originate from.
- Do **not** fetch data from Route Handlers (`route.ts`) or Server Actions (`"use server"` files) for the purpose of *reading* data for a page. Route Handlers and Server Actions exist for mutations and external integrations (webhooks, form submissions, third-party callbacks) — not as a data-loading layer for pages.
- Do **not** fetch on the client (`useEffect`, `fetch` in a Client Component, SWR/React Query, etc.). If a Client Component needs data, the parent Server Component fetches it and passes it down as props.
- This applies project-wide, without exception. If a screen seems to need client-side fetching, that's a sign the component boundary is wrong — pull the fetch up into the nearest Server Component ancestor instead.

## Where database queries happen

- Every database query must be defined as a helper function inside the `/data` directory (`src/data/`), never written inline in a page, layout, component, Server Action, or Route Handler.
- Helper functions in `/data` must use **Drizzle** (`@/db`) to query the database — no other ORMs/query builders.
- **NEVER USE RAW SQL.** No raw SQL strings anywhere — not via `db.execute()`, Drizzle's `sql` template tag as a query substitute, a direct driver/client connection, or any other escape hatch. Every query goes through Drizzle's query builder.
- Server Components call these `/data` helpers to load what they need; they do not import `@/db` or the schema directly.

```
src/
  data/
    workouts.ts     // e.g. getWorkoutsForDate(), getWorkoutDatesForMonth()
  app/
    dashboard/
      page.tsx       // Server Component — calls helpers from @/data/workouts
```

- Keep helpers organized by domain/entity (e.g. `data/workouts.ts`, `data/exercises.ts`), matching the schema modules in `src/db/schema`.
- Auth checks (`auth.protect()`, scoping by `userId`, etc.) belong in the `/data` helper alongside the query it guards, not duplicated in the calling component.

## Data ownership / tenant isolation

- **It is IMPORTANT that a logged-in user can ONLY ever access their own data. They SHOULD NOT be able to view data that belongs to another user.**
- Every `/data` helper that reads or writes user-owned data must derive the user identity **server-side** via `auth.protect()` and filter by that `userId` in the query itself (e.g. `eq(workouts.userId, userId)`). Ownership scoping is part of the query, not a post-fetch filter.
- Never accept a `userId` (or any other identity) as a parameter from the caller, a search param, or the client — the only trusted source of identity is the Clerk session.
- Queries that reach user-owned rows through a relation (e.g. sets → workout exercises → workouts) must still enforce ownership: either join back to the owning table and filter by `userId`, or only query with IDs that came from an already-ownership-scoped query in the same helper.
- When a helper looks up a single record by ID (e.g. `getWorkoutById`), the `userId` filter is still required — a record ID supplied by the client must never be enough on its own to read the row.

## Why

Centralizing queries in `/data` keeps Drizzle usage consistent and auditable, and keeping all fetching in Server Components means there's exactly one data-loading path to reason about — no split between server actions, route handlers, and client-side fetching that can drift out of sync or duplicate logic.
