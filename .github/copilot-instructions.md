# The Golden Rule of Contribution
- "Leave the campsite cleaner than you found it."
- All contributions must include updated unit tests (min. 80% coverage) and updated documentation in the Spec-Kit registry. No code reaches production without a successful GitLab CI/CD pipeline execution.
- KISS (Keep I Simple Stupid) 
- Use SOLID principles

# Implementation plans
- Save all implementation plans in the /implementations directory and use the following pattern ####_feature_name.md

# Project Overview & Architecture
This is an **Exercise Tracker** offline-first PWA, managed as an **Nx Monorepo**.

# File structure
- `/apps/api` — NestJS REST API backend, with PostgreSQL and Drizzle ORM.
- `/apps/web` — Angular Standalone PWA frontend (mobile-first, offline-first with `@angular/service-worker` and local IndexedDB).
- `/libs/shared-types` — common TypeScript interfaces, DTO contracts, enums, and API request/response payloads shared between `apps/api` and `apps/web`.
- `/implementations` — increment/feature/bugfix plans, following the `####_feature_name.md` naming pattern.

# Code Generation Instructions
- Always provide complete, production-ready code with no `// TODO: implement later` shortcuts.
- Ensure all imports between apps and libs use the defined Nx path aliases (`@exercise-tracker/shared-types`).
- Strictly adhere to TypeScript strict mode—no `any` types unless explicitly justified.
