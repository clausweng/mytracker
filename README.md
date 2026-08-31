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
