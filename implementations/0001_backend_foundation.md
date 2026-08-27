# 0001 — Backend Foundation

**Status:** In progress (workspace scaffolded; remaining modules pending)

## Problem
The repository started as documentation-only (no Nx workspace, no code). We need to stand
up the monorepo and deliver a complete, production-ready NestJS REST API backing the
Exercise Tracker PWA scenarios: registration (anonymous + Google/Facebook OAuth), exercise
catalogue with autocomplete and moderation, day sessions, rep logging with offline-safe
batch sync, and period statistics.

## Approach
Scaffold the Nx monorepo (`apps/api`, `apps/web` shell, `libs/shared-types`), define all API
contracts in `libs/shared-types` first, then build the API in strict layers:
Controller (HTTP + Swagger + DTO validation) → Service (domain logic, transactions) →
Drizzle ORM. Schema changes are always made in `apps/api/src/app/database/schema/` and
migrations generated with Drizzle Kit. Local Postgres runs via Docker Compose; GitLab CI runs
lint, test (≥80% coverage), and build.

## Architectural decisions
- **Auth**: JWT access token (short-lived) + refresh token (rotating, hashed in DB).
  Local strategy (username/password/hint Q&A), Google and Facebook OAuth2 strategies via
  Passport. Password + hint answer hashed with argon2.
- **IDs**: `exerciseId` is `number` (serial) per the shared-types contract; users use UUID.
- **Offline sync**: `POST /api/v1/logs/sync` accepts a batch; upsert keyed on
  `(user_id, client_log_id)` unique constraint → `onConflictDoUpdate`, making retries idempotent.
  Response reports per-entry status so the client can clear its outbox.
- **Day sessions**: a "new day" is a `day_sessions` row unique per `(user_id, log_date)`;
  creating it snapshots the user's standard exercises. Logging reps auto-creates the day
  session if missing (offline clients may sync a day they never explicitly opened).
- **Exercise visibility**: `status = 'APPROVED' OR created_by_user_id = :userId`.
- **Stats**: SQL aggregation with `sum()` and `date_trunc()`; period presets
  (week/month/year/since) resolved to a date range in the service.
- **Strict TypeScript**, no `any`. All contracts imported via `@exercise-tracker/shared-types`.

## Data model (Drizzle schema)
- `users` — id (uuid), username (unique, nullable for OAuth-only), password_hash,
  hint_question, hint_answer_hash, display_name, created_at, updated_at.
- `auth_providers` — id, user_id, provider ('GOOGLE'|'FACEBOOK'), provider_user_id,
  unique (provider, provider_user_id).
- `refresh_tokens` — id, user_id, token_hash, expires_at, revoked_at.
- `exercises` — id (serial), name (citext/unique-ish), slug, description,
  status ('PENDING'|'APPROVED'|'REJECTED'), created_by_user_id, created_at.
- `user_exercises` — user_id, exercise_id, is_standard, sort_order (the user's own list).
- `day_sessions` — id, user_id, log_date (date), created_at, unique (user_id, log_date).
- `rep_logs` — id, user_id, exercise_id, day_session_id, client_log_id (uuid), reps,
  log_date, client_timestamp (bigint), created_at, unique (user_id, client_log_id).

## API surface (`/api/v1`)
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`
- `GET /auth/hint/:username`, `POST /auth/reset-password` (hint answer based)
- `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/facebook`, `GET /auth/facebook/callback`
- `GET /users/me`
- `GET /exercises?query=` (autocomplete, ilike), `POST /exercises` (creates PENDING),
  `GET /exercises/mine`, `POST /users/me/exercises`, `DELETE /users/me/exercises/:id`
- `POST /days` (new day), `GET /days/:date`, `GET /days?from=&to=`
- `POST /logs`, `POST /logs/sync` (idempotent batch), `DELETE /logs/:id`
- `GET /stats/summary?period=WEEK|MONTH|YEAR|SINCE&since=&exerciseId=`
- `GET /stats/timeseries?...` (date_trunc buckets)
- `GET /health`

## Steps
1. **scaffold-workspace** ✅ — Created the Nx workspace in place: `apps/api` (NestJS),
   `apps/web` (Angular standalone shell), `libs/shared-types`, wired the
   `@exercise-tracker/shared-types` alias via npm workspaces, ESLint (flat config per
   project), Jest, and TS strict mode. Verified `api`/`web`/`shared-types` all build and lint,
   and that `apps/api` correctly resolves an import from `@exercise-tracker/shared-types`.
2. **shared-types** — Define enums, domain models, and request/response contracts in
   `libs/shared-types/src/lib/*.ts` and export from `index.ts`. Log contracts include
   `clientLogId`, `exerciseId`, `reps`, `logDate`, `clientTimestamp`.
3. **infra-docker** — `docker-compose.yml` with Postgres 16, `.env.example`, config module
   with validated environment variables.
4. **drizzle-setup** — Install Drizzle + `pg`, create `apps/api/drizzle.config.ts`, the
   `DatabaseModule` exposing the `DRIZZLE_DB` DI token, and the migration scripts.
5. **db-schema** — Implement all tables and relations in
   `apps/api/src/app/database/schema/`, then generate the initial migration into
   `apps/api/src/app/database/migrations/`.
6. **seed-exercises** — Seed script inserting a catalogue of APPROVED baseline exercises
   (push-ups, pull-ups, squats, sit-ups, …).
7. **auth-module** — Local register/login, argon2 hashing, JWT access + rotating refresh
   tokens, hint-question password reset, `JwtAuthGuard`, `@CurrentUser()` decorator.
8. **oauth-module** — Google and Facebook Passport strategies, account linking through
   `auth_providers`, callback issuing the JWT pair.
9. **exercises-module** — Autocomplete search (`ilike`), visibility filter
   (APPROVED OR own), user submission creating PENDING records, user standard-exercise list
   management.
10. **days-module** — Create/fetch day sessions, return the day's exercises with accumulated
    reps per exercise.
11. **logs-module** — Single rep log creation returning the day's accumulated total, plus the
    idempotent `POST /logs/sync` batch upsert on `clientLogId`.
12. **stats-module** — Period resolution (week/month/year/since) and aggregation queries
    with `sum()` / `date_trunc()`.
13. **swagger-bootstrap** — Global `ValidationPipe`, versioned `/api/v1` prefix, CORS,
    Helmet, exception filter, Swagger document at `/api/docs`.
14. **tests** — Unit tests per service/controller and e2e tests for auth, sync idempotency,
    and stats; enforce ≥80% coverage thresholds in the Jest config.
15. **ci-pipeline** — `.gitlab-ci.yml` with install → lint → test (Postgres service) →
    build stages using Nx affected commands.
16. **docs** — Keep this document and `README.md` up to date as each step completes.

## Notes & considerations
- Exercise moderation: no admin UI in this increment. New exercises land as `PENDING` and are
  visible only to their creator; an approval endpoint guarded by an admin role is included so
  moderation is possible via API.
- `logDate` is always supplied by the client (offline devices may sync days later); the server
  validates it is a valid `YYYY-MM-DD` and not in the future beyond a small clock-skew margin.
- Sync conflict rule: last-write-wins per `clientLogId`, compared using `clientTimestamp`.
- Rate limiting (`@nestjs/throttler`) applied to auth endpoints.
- The `apps/web` app is only scaffolded here; frontend features are a separate increment.
- `apps/web/tsconfig.json` overrides `composite`/`declaration`/`declarationMap`/
  `emitDeclarationOnly` from the root `tsconfig.base.json` (incompatible with Angular's
  compiler) and adds the `dom` lib.
