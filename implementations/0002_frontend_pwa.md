# 0002 — Frontend PWA (apps/web)

**Status:** Implemented. All 13 todos complete; unit tests and production build passing.
Known gaps carried into a future increment: no in-app `/auth/callback` route (API returns OAuth
tokens as JSON rather than redirecting), and exercise drag-and-drop reorder is local-only
(no reorder-persistence endpoint). See `README.md` → "Frontend (`apps/web`)" for run/build/test
instructions.

## Problem
`libs/shared-types` and the NestJS API (`/api/v1`) are complete, but `apps/web` is still the
untouched Nx Angular 22 starter: empty routes, no service worker, no HTTP layer, no offline
storage, no UI. We need the full mobile-first, offline-first PWA covering every scenario in
`product-description.md`: register/login (anonymous + Google/Facebook), exercise catalogue with
autocomplete and user submissions, "New day", add reps with accumulated totals, and statistics
per period.

## Approach
Build a standalone-component Angular app with signal-based state, lazy-loaded feature routes and
a strict Controller-free layering: **feature component → facade/store (signals) → data service
(HTTP) → offline repository (IndexedDB) → sync engine**. All DTOs come from
`@exercise-tracker/shared-types` — no locally redefined contracts.

Offline-first strategy (the core architectural decision):
- Every read (exercises, day sessions, stats snapshot) is served from IndexedDB first, then
  refreshed from the network ("stale-while-revalidate" at the data layer, not just the SW).
- Every rep log is written locally with a client-generated `clientLogId` (uuid) +
  `clientTimestamp`, the day total is incremented optimistically, and the entry is queued in an
  **outbox** object store.
- A `SyncService` flushes the outbox through `POST /api/v1/logs/sync` (idempotent upsert on
  `(userId, clientLogId)`) whenever the app starts, regains connectivity (`navigator.onLine` +
  `window online` event) or after each successful online write. Per-entry
  `SyncEntryStatus` results clear the outbox.
- `@angular/service-worker` caches the app shell (`ngsw-config.json`, prefetch assets,
  freshness strategy for `/api/v1` GETs) so the app boots offline.

Decisions taken:
- **UI library**: **Angular Material** (`@angular/material` + `@angular/cdk` ~22.x) with a custom
  Material 3 theme built from `mat.theme()` in SCSS. Mobile-first (360–430px baseline),
  ≥48px Material touch targets. Components used: toolbar, bottom nav (button toggle/tab bar),
  card, list, form-field/input, autocomplete, button, fab, bottom-sheet, dialog, snackbar,
  progress-spinner, datepicker (for the SINCE period), chips.
- **Statistics visualisation**: accessible in-house SVG/CSS bar list styled with Material theme
  tokens — no chart library.
- **Auth transport**: access token kept in memory (signal) + refresh token in `localStorage`;
  a functional `HttpInterceptor` attaches the bearer token and transparently refreshes on 401
  with a single-flight queue.
- **OAuth**: buttons redirect to `GET /api/v1/auth/google|facebook`; a `/auth/callback` route
  reads the returned tokens and hydrates the session.
- **Out of scope for this increment**: admin moderation screen, e2e (Playwright) suite,
  push notifications.

## Todos

1. **web-deps-config** — Install/wire frontend dependencies and app config:
   `@angular/material` + `@angular/cdk`, `@angular/service-worker`, `idb`;
   `provideHttpClient(withInterceptors(...))`, `provideAnimationsAsync()`,
   `provideServiceWorker` (enabled in production), `provideRouter` with
   `withComponentInputBinding()`. Add `ngsw-config.json`, `manifest.webmanifest`, icons in
   `apps/web/public`, and register the manifest/theme-color in `index.html`. Update
   `apps/web/project.json` build options (`serviceWorker`, `ngswConfigPath`, `assets`,
   Material icon font/style assets, raised component-style budget) and add a dev proxy
   (`proxy.conf.json`) to `http://localhost:3000/api/v1`.

2. **web-core-env** — Environment/config: `apiBaseUrl` token (`API_BASE_URL` InjectionToken)
   with dev/prod values, plus `core/` folder skeleton (`core/http`, `core/auth`, `core/offline`,
   `core/ui`).

3. **web-offline-db** — IndexedDB layer with `idb`: `db.ts` defining stores
   (`exercises`, `userExercises`, `days`, `outbox`, `meta`) with typed schema, and
   `OfflineRepository` services exposing typed get/put/delete/list helpers. Fully unit tested
   with `fake-indexeddb`.

4. **web-auth-core** — `AuthStore` (signals: `user`, `accessToken`, `isAuthenticated`),
   `AuthApiService` (`register`, `login`, `refresh`, `logout`, `getHintQuestion`,
   `resetPassword`), token persistence service, `authInterceptor` (bearer + single-flight 401
   refresh), `authGuard`/`guestGuard` functional route guards. Depends on web-deps-config.

5. **web-auth-ui** — Lazy `auth` feature: login, register (username, password, displayName,
   hint Q&A), forgot-password (fetch hint question → answer → new password) and
   `/auth/callback` OAuth landing route. Reactive forms with `mat-form-field` + `mat-error`,
   `mat-progress-spinner` on submit, snackbar for failures, Google/Facebook redirect buttons.
   Depends on web-auth-core, web-shell.

6. **web-shell** — App shell: `App` root with router outlet, `mat-toolbar` header and a
   bottom navigation bar (Today, Exercises, Stats, Profile), offline/sync status banner driven by
   a `ConnectivityService`, Material 3 theme setup (`styles.scss` with `mat.theme()`, custom
   palette, density and typography tokens, dark-mode via `prefers-color-scheme`), and a
   `NotificationService` wrapping `MatSnackBar`. Removes `nx-welcome.ts`.

7. **web-exercises** — Exercise feature: `ExerciseApiService` (`GET /exercises?query=`,
   `GET /exercises/mine`, `POST /exercises`) with a `mat-autocomplete` (300 ms debounce) that is
   offline-aware and backed by the cached exercise store, "submit new exercise" dialog showing the
   PENDING moderation state as a `mat-chip`, and standard-exercise management
   (`GET/POST/DELETE /users/me/exercises`) using `mat-list` with CDK drag-drop reorder and remove.
   Depends on web-offline-db, web-auth-core.

8. **web-day-reps** — Core "Today" feature: "New day" button (`POST /days`, idempotent),
   `GET /days/:date` with local fallback, per-exercise `mat-card` showing accumulated reps and a
   large "Add reps" action opening a `MatBottomSheet` numeric quick-entry (presets 5/10/20 +
   free input). Optimistic local increment → outbox → response reconciliation of
   `accumulatedReps`. Depends on web-offline-db, web-exercises.

9. **web-sync-engine** — `SyncService`: outbox flush via `POST /logs/sync`, retry/backoff,
   per-entry `SyncEntryStatus` handling, pending-count signal surfaced in the shell banner,
   triggers on app init, `online` event and after each local write. Depends on web-offline-db,
   web-day-reps.

10. **web-stats** — Statistics feature: period selector (`mat-button-toggle-group` for
    WEEK/MONTH/YEAR/SINCE with `mat-datepicker` for SINCE), optional exercise filter,
    `GET /stats/summary` and `GET /stats/timeseries`, rendered as an accessible SVG/CSS bar list
    using Material theme tokens plus a `mat-table` of totals with a caption and
    screen-reader-friendly values; last successful response cached for offline viewing.
    Depends on web-offline-db, web-auth-core.

11. **web-a11y-pwa-polish** — Accessibility and PWA pass: focus management on route change,
    skip link, aria-live regions for rep totals and sync status, colour-contrast audit of the
    Material theme, reduced-motion support, install prompt handling (`beforeinstallprompt`),
    offline fallback page. Verify with an axe check.

12. **web-tests** — Unit tests (`@angular/build:unit-test`) for all services, stores, guards,
    interceptor, sync engine and key components; ≥80% coverage enforced. Include offline/outbox
    scenarios and 401-refresh scenarios.

13. **web-docs** — Update `README.md` with frontend run/build/test/PWA instructions and keep
    this file's status current as todos complete.

## Notes & considerations
- Angular 22 + `@angular/build:unit-test` executor: tests run under Vitest-style tooling — verify
  the runner and add `fake-indexeddb` + zoneless test setup accordingly.
- No `@angular/material`, `@angular/cdk`, `@angular/service-worker` or `idb` in `package.json` yet;
  all must be added at versions matching Angular ~22.0.4 (`ng add @angular/material` via the Nx
  Angular generator so the theme and typography are wired correctly).
- Angular Material components are zoneless-compatible in v22, but harness-based tests need
  `@angular/cdk/testing` — add it to the test setup.
- Material raises component style sizes: bump the `anyComponentStyle` budget in
  `apps/web/project.json` if the theme pushes past 4kb, and keep the initial bundle under the
  500kb warning by importing Material modules per-component (standalone imports only).
- The service worker only runs in production builds; the offline data layer (IndexedDB + outbox)
  must therefore be independently testable and functional in dev.
- `exerciseId` is a `number` (serial) while user/day ids are strings — keep types strict when
  keying IndexedDB stores.
- Dates: use a small `LogDate` helper producing local `YYYY-MM-DD` strings to avoid UTC
  off-by-one when starting a new day; never call `new Date()` in templates.
- OAuth callback token delivery must match `apps/api/src/app/oauth/oauth.controller.ts` — confirm
  the redirect format (query params vs fragment) before implementing web-auth-ui.
- All contracts imported from `@exercise-tracker/shared-types`; no `any`, strict mode throughout.
