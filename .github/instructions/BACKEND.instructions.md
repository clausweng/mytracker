---
applyTo: "apps/api/**"
---

You are an expert full-stack engineer working on an offline-first **Exercise Tracker PWA** backend. The workspace is an **Nx Monorepo** and this app is the NestJS REST API using PostgreSQL and Drizzle ORM.

## Shared Types First
- Never define raw API contract types separately in `apps/api` and `apps/web`.
- Domain contracts live in `libs/shared-types/src/lib/*.ts` and are exported via `index.ts`.
- Import shared types using the `@exercise-tracker/shared-types` path alias.
- Every offline log entry contract MUST include `clientLogId: string` (UUID v4), `exerciseId: number`, `reps: number`, `logDate: string` (YYYY-MM-DD), and `clientTimestamp: number` (epoch ms).

## Layered Architecture
- Follow strict separation: Controllers (HTTP/Routing/Swagger) → Services (domain logic & transactions) → Drizzle ORM (database queries).
- Inject the Drizzle client into services via the DI token `@Inject(DRIZZLE_DB)`.

## Swagger & Validation
- Every Controller must have `@ApiTags()`, `@ApiOperation()`, and explicit `@ApiResponse()` decorators.
- Every incoming request body MUST use a DTO class implementing the matching interface from `@exercise-tracker/shared-types`.
- Decorate DTO fields with both `@ApiProperty()` and `class-validator` decorators.

## Database & Queries (Drizzle ORM)
- Tables live in `apps/api/src/app/database/schema/`.
- Use relational queries (`db.query...`) for nested reads and SQL expressions (`db.select().from(...)`) for stats aggregations (`sum()`, `date_trunc()`).
- Use `ilike(exercises.name, \`%${query}%\`)` for autocomplete.
- Exercises filter logic: return `status = 'APPROVED'` OR `created_by_user_id = :userId`.

## Database Migrations (Drizzle Kit)
- Use **Drizzle Kit** to generate and run all database migrations; never hand-write SQL migrations or alter schema directly in the database.
- Define schema changes in `apps/api/src/app/database/schema/` first, then run `drizzle-kit generate` to produce the migration files.
- Store generated migrations in `apps/api/src/app/database/migrations/` and commit them alongside the schema change.
- Apply migrations via `drizzle-kit migrate` (or the project's configured migrate script) as part of deployment/CI; never rely on `drizzle-kit push` for production environments.
- Keep `drizzle.config.ts` at the `apps/api` root, pointing to the schema and migrations folders and reading DB connection details from environment variables.

## Offline Sync & Idempotency
- Batch sync endpoints (`POST /api/v1/logs/sync`) must handle upserts using `clientLogId` to prevent duplicate counts during network retries.

## Authentication
- Support OAuth2 login via Google and Facebook strategies.
- Allow anonymous registration with `username`, `password`, and a security question + answer pair (`hintQuestion`, `hintAnswerHash`) for password resets without email.

## Code Generation
- Always provide complete, production-ready code with no `// TODO: implement later` shortcuts.
- Strictly adhere to TypeScript strict mode—no `any` types unless explicitly justified.
