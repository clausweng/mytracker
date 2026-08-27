---
applyTo: "libs/shared-types/**"
---

You are maintaining the single source of truth for API contracts in the **Exercise Tracker PWA** Nx monorepo.

## Shared Types First

- Never let `apps/api` and `apps/web` define raw API contract types separately.
- Define domain contracts, DTO interfaces, enums, and API request/response payloads in `libs/shared-types/src/lib/*.ts` and export them via `index.ts`.
- Both apps import these contracts using the `@exercise-tracker/shared-types` path alias.

## Offline Sync Contracts

- Every offline log entry contract MUST include:
  - `clientLogId: string` (UUID v4)
  - `exerciseId: number`
  - `reps: number`
  - `logDate: string` (YYYY-MM-DD)
  - `clientTimestamp: number` (epoch ms)

## Code Generation

- Always provide complete, production-ready code with no `// TODO: implement later` shortcuts.
- Strictly adhere to TypeScript strict mode—no `any` types unless explicitly justified.
