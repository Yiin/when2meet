# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Meet is a when2meet-style group scheduling app: an organizer picks dates, shares a link, participants paint 15-minute availability slots on a grid, and a heatmap shows group overlap. Live-updated via WebSocket so all viewers see edits without reloading.

## Monorepo layout

Two independent packages, no cross-imports. The repo root only contains scripts that delegate into them.

- `api/` — Bun HTTP/WebSocket server with `bun:sqlite` persistence. Entry: `api/src/index.ts`. DB layer: `api/src/db.ts`.
- `web/` — Vue 3 SPA (Vite, Tailwind 4, Pinia, Vue Router). Built with `vite build`; type-checked with `vue-tsc`.
- `data/meet.db` — SQLite file (created on first run).
- `Dockerfile` — multi-stage build that produces a single Bun runtime image which serves `/api/*` and the built SPA from one process (the SPA is `COPY`d into `./public` and the API does the SPA fallback).

## Commands

From the repo root:

- `bun run dev:api` → API on :3001 (`bun --hot api/src/index.ts`)
- `bun run dev:web` → Vite dev server on :5173, with `/api` and `/ws` proxied to :3001
- `bun run test:e2e` → Playwright (auto-boots BOTH api and web; see `web/playwright.config.ts`)

Inside `web/`:

- `bun run dev`, `bun run build`, `bun run preview`
- `bun run type-check` (vue-tsc) — required separately because `bun run build` runs both
- `bun run test:unit` (Vitest), `bun run test:e2e` (Playwright)
- `bun run test:e2e --project=chromium` or `bun run test:e2e <file>` to narrow scope
- `bun run lint` runs oxlint then eslint; `bun run format` runs prettier

Inside `api/`: `bun run dev` (hot reload) or `bun run start`.

## Architecture

**Wire format / contract.** `EventData` (web `src/types.ts`) and `EventRecord` (api `src/db.ts`) are kept in sync **by hand** — there is no shared package. The shape is `{ id, name, dates: ["YYYY-MM-DD", ...], participants: [{ name, slots: [ISO-UTC-string, ...] }] }`. When changing this shape, update both files.

**Slot keys are ISO-UTC strings.** `web/src/lib/slots.ts:slotKey()` builds them from a local-date + `HH:mm` via `new Date(...).toISOString()`. The grid renders one column per date and 96 rows (24h × 15min). Tests assert on `data-slot="<ISO>"` exactly.

**WebSocket topic naming MUST match.** API uses `"event:" + eventId` (`api/src/index.ts`); web mirrors it in `web/src/lib/ws.ts:wsTopicFor()`. Client sends `{ type: "subscribe" | "unsubscribe", eventId }`; server pushes `{ type: "event", event }` on every availability mutation (and once on subscribe).

**Single-process production.** In Docker, `api/src/index.ts` also serves static files from `STATIC_DIR` (`./public`) with SPA fallback. Path-traversal is guarded via `normalize`+`startsWith(DIST_DIR)`. Locally, Vite handles SPA serving and proxies `/api` + `/ws`; the API never serves static files in dev.

**State.** Pinia store `web/src/stores/event.ts` is the single source of truth on the client. `saveAvailability` does optimistic local update with snapshot rollback on failure. `useEventSocket` is a singleton WS with reconnect/backoff.

## Test-ID contract

`web/e2e/USER_STORIES.md` is the **binding acceptance contract**. The `data-testid` names listed there (`event-name-input`, `slot-cell`, `group-slot-cell`, `personal-grid`, `save-indicator`, etc.) MUST be rendered exactly — Playwright specs depend on them. Read this file before changing any component markup.

## LocalStorage keys

- `w2m-theme` — `"light"` or `"dark"`
- `w2m-name:<eventId>` — remembered participant name; auto-joins on return

## Bun-specific notes (api/)

The `api/` package targets Bun, not Node:

- Use `bun:sqlite` (`Database` from there), not `better-sqlite3`.
- Use `Bun.serve()` for HTTP+WebSocket on a single port. Don't pull in `express` or `ws`.
- Prefer `Bun.file` over `node:fs` readFile/writeFile.
- `.env` loads automatically; don't import `dotenv`.

The web package is conventional Node/Vite tooling — keep it that way (npm-run-all2, vue-tsc, etc. live there).

## Docker quirk

`Dockerfile` skips `vue-tsc` inside the build stage and runs only `bun run build-only`. Reason (in the file): `vue-tsc`'s shebang is `#!/usr/bin/env node`, and the `oven/bun` image's Bun-based `node` shim mishandles `.vue` virtual-module resolution. Type-checking is enforced in dev and CI, not in the container build. Don't "fix" this by re-adding `vue-tsc` to the Docker build.

## Git diff with external tool

`~/.gitconfig` sets `diff.external` to difftastic, which prints non-unified output that breaks tooling. Always pass `--no-ext-diff`: `git diff --no-ext-diff`, `git diff --no-ext-diff --stat <path>`, `git show --no-ext-diff`, etc.
