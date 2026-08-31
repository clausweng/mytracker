# Exercise Tracker

A mobile-first, offline-capable Progressive Web App (PWA) for tracking daily exercise repetitions.

Register with Facebook, Google, or an anonymous username/password (with a security question for password resets). Add exercises (with autocomplete suggestions and validation before they're publicly visible), start a new day, and log reps as you complete sets. View statistics over custom periods — this week, this month, this year, or since a given date.

## Architecture

Built as an Nx Monorepo:
- `apps/api` — NestJS REST API with PostgreSQL and Drizzle ORM.
- `apps/web` — Angular Standalone PWA, offline-first with IndexedDB and `@angular/service-worker`.
- `libs/shared-types` — shared TypeScript contracts between API and web app.

See `.github/copilot-instructions.md` and `.github/instructions/` for detailed development guidelines.

## Getting Started

### Prerequisites
- Node.js 22+ or 24+
- npm 11+

### Install dependencies
```bash
npm install
```

### Run the full stack (quick start)
```bash
cp .env.example .env               # dummy dev secrets, DATABASE_URL, OAuth placeholders
docker compose up -d postgres      # PostgreSQL 16 on localhost:5432
npx nx run api:db-migrate          # apply Drizzle migrations
npx nx run api:db-seed             # insert the baseline APPROVED exercises
npx nx serve api                   # terminal 1 — API on http://localhost:3000
npx nx serve web                   # terminal 2 — PWA on http://localhost:4200
```
Open `http://localhost:4200`. The web app proxies `/api/v1/*` to the API, so both must be
running. See the sections below for build/test commands and per-app details.

## Backend (`apps/api`)

### Prerequisites
- Docker (for the PostgreSQL 16 container)

### Set up and run
```bash
cp .env.example .env               # dummy dev secrets, DATABASE_URL, OAuth placeholders
docker compose up -d postgres      # PostgreSQL 16 on localhost:5432
npx nx run api:db-migrate          # apply Drizzle migrations
npx nx run api:db-seed             # insert the baseline APPROVED exercises
npx nx serve api                   # watch mode on http://localhost:3000
```

- REST API: `http://localhost:3000/api/v1` (single global prefix, no URI versioning)
- Swagger UI: `http://localhost:3000/api/docs` (OpenAPI JSON at `/api/docs-json`)
- Health probe: `http://localhost:3000/api/v1/health`

### Build
```bash
npx nx build api
node -r dotenv/config apps/api/dist/main.js
```

### Quality gates
```bash
npx nx run-many -t lint build --projects=api,shared-types
npx nx test api --coverage        # Jest, 80% global coverage thresholds
```
Unit tests mock the Drizzle client; the e2e suites in `apps/api/src/test/e2e/` require the
migrated and seeded local database to be running. CI runs the same gates on GitHub Actions
(`.github/workflows/ci.yml`).

### Available Nx targets
| Target | Purpose |
| --- | --- |
| `api:serve` | Run the API in watch mode |
| `api:build` | Production build into `apps/api/dist` |
| `api:db-generate` | Generate a Drizzle migration from the schema |
| `api:db-migrate` | Apply pending migrations |
| `api:db-seed` | Seed the baseline exercise catalogue |
| `api:test` / `api:lint` | Jest suites / ESLint |

See `/implementations/0001_backend_foundation.md` for the full backend increment plan.

## Frontend (`apps/web`)

Angular 22 standalone-component PWA (zoneless change detection) using **Angular Material** for
UI, IndexedDB (`idb`) for offline storage, and `@angular/service-worker` for app-shell caching.

### Run in development
```bash
npx nx serve web
```
Serves on `http://localhost:4200` and proxies `/api/v1/*` to `http://localhost:3000` (see
`apps/web/proxy.conf.json`), so run `apps/api` alongside it (see above). The service worker is
disabled in dev builds — offline behaviour there comes solely from the IndexedDB-backed
repositories/outbox, which work with or without the network.

### Build
```bash
npx nx build web --configuration=production
```
Emits to `apps/web/dist/browser`, including the compiled service worker (`ngsw-worker.js`),
`ngsw.json`, `manifest.webmanifest`, and PWA icons (`apps/web/public/icons`). Serve the output
with any static file server over HTTPS (or `localhost`) for the service worker to register.

### Test
```bash
npx nx test web
```
Runs the Vitest-based unit tests (`@angular/build:unit-test`) covering the offline repositories
and outbox, the auth store/guards/interceptor (including single-flight 401 refresh), the sync
engine, and the app shell.

### Offline-first architecture
- Every read (exercises, day sessions, stats) is served from IndexedDB first, then refreshed from
  the network.
- Every rep log is written locally with a client-generated `clientLogId`, the day total is
  incremented optimistically, and the entry is queued in an IndexedDB **outbox** store.
- `SyncService` flushes the outbox through the idempotent `POST /api/v1/logs/sync` on app start,
  when connectivity is regained, and after each local write.
- Installability: the app is installable on mobile/desktop (`beforeinstallprompt` banner in the
  shell) and boots offline once the service worker has cached the app shell.

### Known limitations (tracked for a future increment)
- OAuth (`Google`/`Facebook`) buttons perform a full-page redirect to the API; the API's
  `/auth/{provider}/callback` returns the token payload as JSON rather than redirecting back to
  the SPA with tokens, so there's no in-app `/auth/callback` hydration route yet.
- Exercise reordering (drag-and-drop in "My Exercises") is local-only; there is no
  `PATCH /users/me/exercises/reorder` endpoint yet, so the order isn't persisted across reloads.

See `/implementations/0002_frontend_pwa.md` for the full frontend increment plan.

## Run everything with Docker Compose

Builds and runs the whole system — PostgreSQL, the NestJS API, a one-off migrate/seed job, and
the Angular PWA served by nginx (which reverse-proxies `/api/v1/*` to the API, same as the dev
proxy) — with no local Node.js install required.

```bash
cp .env.example .env
docker compose up --build
```

- Web app: `http://localhost:${WEB_PORT:-8080}`
- API directly: `http://localhost:3000/api/v1` (Swagger: `http://localhost:3000/api/docs`)

Services:
| Service | Image | Purpose |
| --- | --- | --- |
| `postgres` | `postgres:16-alpine` | Database, healthchecked with `pg_isready` |
| `migrate` | built from `apps/api/Dockerfile` (`target: migrate`) | Runs `drizzle-kit migrate` then the idempotent exercise seed; exits when done |
| `api` | built from `apps/api/Dockerfile` (`target: runtime`) | NestJS API; waits for `migrate` to finish, healthchecked at `/api/v1/health` |
| `web` | built from `apps/web/Dockerfile` | Production Angular build served by nginx; waits for `api` to be healthy |

Set `WEB_PORT` in `.env` if `8080` is already taken on your host. Stop everything with
`docker compose down` (add `-v` to also drop the Postgres volume).
