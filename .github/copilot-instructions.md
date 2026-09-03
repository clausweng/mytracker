## The Golden Rule of Contribution
- "Leave the campsite cleaner than you found it."
- All contributions must include updated unit tests (min. 80% coverage) and updated documentation in the Spec-Kit registry. No code reaches production without a successful GitLab CI/CD pipeline execution.
- KISS (Keep I Simple Stupid) 
- Use SOLID principles

## When in Plan Mode (or when asked to produce a plan/design):
- Do NOT write or edit source files
- Save all implementation plans and tasks in the /implementations directory and use the following pattern ####_feature_name.md
- Restrict your output exclusively to the Phase 1 Planning Specification format:
  1. Architecture & Interface contracts (DTOs, signatures, boundaries).
  2. Affected files table (`CREATE`, `MODIFY`, `DELETE` with scopes).
  3. Data flow and state transitions.
  4. Step-by-step sequential atomic implementation steps.
- Probe for edge cases, failure states, and ask clarifying questions before finalizing.

## When in Normal / Agent / Implementation Mode:
- Execute changes against the established plan.
- Always implement the plan in a new branch
- Implement code incrementally, verify with CLI test/build commands, and keep diffs focused.

## Project Overview & Architecture
This is an **Exercise Tracker** offline-first PWA, managed as an **Nx Monorepo**.

### File structure
- `/apps/api` — NestJS REST API backend, with PostgreSQL and Drizzle ORM.
- `/apps/web` — Angular Standalone PWA frontend (mobile-first, offline-first with `@angular/service-worker` and local IndexedDB).
- `/libs/shared-types` — common TypeScript interfaces, DTO contracts, enums, and API request/response payloads shared between `apps/api` and `apps/web`.
- `/implementations` — increment/feature/bugfix plans, following the `####_feature_name.md` naming pattern.

### Code Generation Instructions
- Always provide complete, production-ready code with no `// TODO: implement later` shortcuts.
- Ensure all imports between apps and libs use the defined Nx path aliases (`@exercise-tracker/shared-types`).
- Strictly adhere to TypeScript strict mode—no `any` types unless explicitly justified.
