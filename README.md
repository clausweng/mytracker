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

### Start the backend API
```bash
npx nx serve @exercise-tracker/api
```
The API starts in watch mode at `http://localhost:3000/api` (restarts automatically on file
changes).

### Build the backend API
```bash
npx nx build @exercise-tracker/api
```
Production output is written to `apps/api/dist`; run it with `node apps/api/dist/main.js`.

> Note: database connectivity (PostgreSQL via Docker Compose + Drizzle ORM) is not wired up
> yet — see `/implementations/0001_backend_foundation.md` for the current implementation
> status and remaining steps.
