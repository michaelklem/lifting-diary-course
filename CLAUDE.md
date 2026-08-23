# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Before writing any code

**IMPORTANT**: \clearAlways check the `docs/` directory first and follow whatever standards it contains — they are binding project conventions, not suggestions. For example, `docs/ui.md` defines the UI component and date-formatting rules. Re-check `docs/` as it grows; don't rely on this file alone to know what's in there.

## Project status

This is a freshly scaffolded Next.js app (the unmodified `create-next-app` output) — no application code, routes beyond the placeholder home page, or tests have been added yet. Treat `src/app/page.tsx` as throwaway starter content, not an established pattern to preserve.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint via the flat config in `eslint.config.mjs` (`eslint-config-next` core-web-vitals + typescript rule sets)

No test runner is configured yet.

## Architecture notes

- **App Router only**, rooted at `src/app/`. The `@/*` import alias resolves to `src/*` (`tsconfig.json`).
- **Next.js 16.3.1 / React 19.2.8** — new enough that conventions differ from older training data (see the block imported from `AGENTS.md` above: read `node_modules/next/dist/docs/01-app/` before implementing unfamiliar App Router features). One concrete example already in this codebase: `layout.tsx` types its props with the generated `LayoutProps<"/">` helper instead of a hand-written interface — follow the same typed-route pattern (`PageProps<"/some/route">`, etc.) for new pages/layouts.
- **Styling**: Tailwind CSS v4, configured CSS-first in `src/app/globals.css` (`@import "tailwindcss"` + `@theme inline`) — there is no `tailwind.config.js`. Light/dark colors are defined as CSS variables and swapped via `prefers-color-scheme`. Fonts (Geist Sans/Mono) load through `next/font/google` and are exposed as CSS variables consumed by the `@theme inline` block.
