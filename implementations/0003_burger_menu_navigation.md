# 0003 — Burger Menu Navigation (replaces bottom nav)

## Problem & Approach

**Problem.** The web shell (`apps/web/src/app/app.html`) navigates via a fixed `.bottom-nav`
bar with three links (Today / Exercises / Stats). This consumes permanent vertical space on a
mobile-first PWA, does not scale past ~5 destinations, and leaves no home for account actions —
the app currently has **no logout UI at all** despite `AuthApiService.logout()` existing.

**Approach.** Replace the bottom nav with a `mat-sidenav` drawer opened by a burger
(`mat-icon-button` + `menu` icon) in the existing `mat-toolbar`. The drawer opens from the
**end (right)** side in `over` mode, and hosts: a user identity header, the three primary
navigation destinations, a theme toggle (light / dark / system), an "Install app" entry, an
"About" version line, and a logout action.

Three supporting concerns are pulled out of `App` into single-responsibility root services
(SRP), so `App` remains a thin shell:

- `ThemeService` — theme preference signal + persistence + `<html data-theme>` application.
- `PwaInstallService` — owns the `beforeinstallprompt` event (moved out of `App`).
- `AuthSessionService` — orchestrates logout (API call → store clear → redirect).

The bottom nav is **removed entirely**; the drawer is the only navigation on all viewports.

---

## 1. Architecture & Interface Contracts

### 1.1 Shell composition

```
App (app.ts / app.html)
└── mat-sidenav-container
    ├── mat-sidenav  [position="end" mode="over" #drawer]
    │   └── <app-nav-drawer (navigate)="drawer.close()" />
    └── mat-sidenav-content
        ├── mat-toolbar   → burger button (menuOpen output) + title
        ├── offline / syncing banner   (unchanged)
        └── <main id="main-content"><router-outlet/></main>
```

`App` no longer renders `.bottom-nav` or the `.install-banner`; both responsibilities move
into `NavDrawerComponent`.

### 1.2 `ThemeService` — `apps/web/src/app/core/ui/theme.service.ts`

```ts
export type ThemePreference = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Persisted user preference. */
  readonly preference: Signal<ThemePreference>;
  /** Preference resolved against `prefers-color-scheme` when 'system'. */
  readonly resolvedTheme: Signal<'light' | 'dark'>;

  setPreference(preference: ThemePreference): void;
  /** Cycles light → dark → system → light. */
  toggle(): void;
}
```

- Storage key: `exercise-tracker.theme` (localStorage). Unknown/absent value → `'system'`.
- An `effect()` writes `document.documentElement.dataset.theme = resolvedTheme()`.
- A `MediaQueryList` listener on `(prefers-color-scheme: dark)` keeps `resolvedTheme` live
  while the preference is `'system'`.
- All `window`/`document`/`localStorage` access is guarded by `typeof window !== 'undefined'`
  (matches the existing pattern in `app.ts` and `auth.store.ts`).

### 1.3 `PwaInstallService` — `apps/web/src/app/core/ui/pwa-install.service.ts`

```ts
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  /** True while a deferred browser install prompt is available. */
  readonly canInstall: Signal<boolean>;
  /** Resolves to true when the user accepted the prompt. */
  install(): Promise<boolean>;
}
```

Moves the `beforeinstallprompt` listener and `installApp()` verbatim out of `App`.

### 1.4 `AuthSessionService` — `apps/web/src/app/core/auth/auth-session.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  /** Best-effort server logout, then unconditional local teardown + redirect. */
  logout(): Promise<void>;
}
```

Contract: read `authStore.refreshToken()`; if present call
`authApi.logout({ refreshToken })` (typed by `LogoutRequest` from
`@exercise-tracker/shared-types`). Any HTTP failure is swallowed — the local session is cleared
regardless, so an offline user is never trapped in a signed-in state. Always finishes with
`authStore.clear()` and `router.navigateByUrl('/auth/login')`.

### 1.5 `NavDrawerComponent` — `apps/web/src/app/core/ui/nav-drawer/nav-drawer.component.ts`

```ts
@Component({ selector: 'app-nav-drawer', changeDetection: OnPush, /* external template + scss */ })
export class NavDrawerComponent {
  /** Emitted after any action that should dismiss the drawer. */
  readonly navigate = output<void>();
}
```

- Inputs: none — it reads `AuthStore`, `ThemeService`, `PwaInstallService`,
  `AuthSessionService` via `inject()`.
- `output()` function form (not `@Output()` decorator), per frontend instructions.
- Internal `computed()`s: `displayName` (`user()?.name ?? user()?.email ?? 'Account'`),
  `themeIcon` (`light_mode` / `dark_mode` / `brightness_auto`), `themeLabel`.
- `appVersion` is injected from the `APP_VERSION` token (§1.6).
- Material modules imported directly: `MatListModule`, `MatIconModule`, `MatButtonModule`,
  `MatDividerModule`, plus `RouterLink` / `RouterLinkActive`.

### 1.6 Version surface

`Environment` (`apps/web/src/environments/environment.types.ts`) gains a required
`appVersion: string`. Both `environment.ts` (`'0.0.0-dev'`) and `environment.prod.ts` are
updated. `NavDrawerComponent` consumes it through a new
`APP_VERSION = new InjectionToken<string>('APP_VERSION')` provided in `app.config.ts` from
`environment.appVersion`, keeping the component decoupled from the environment file and
trivially stubbable in tests.

### 1.7 Theming contract change

`styles.scss` currently keys dark mode solely off `@media (prefers-color-scheme: dark)`. To let
the toggle win over the OS setting, the two `mat.theme(...)` blocks are extracted into a local
SCSS mixin `app-theme($theme-type)` and applied at three selectors:

| Selector | Meaning |
| --- | --- |
| `html` | light baseline |
| `html[data-theme='dark']` | explicit dark (toggle) |
| `@media (prefers-color-scheme: dark) { html:not([data-theme='light']) }` | OS dark, not explicitly overridden |

`color-scheme` becomes `light dark` on `html`, narrowed to `light` / `dark` under the explicit
attribute selectors so native form controls and scrollbars follow the choice.

**Note:** the `data-theme` attribute is always written by `ThemeService` (never left absent
once the app boots), so the media-query branch only matters for the pre-hydration first paint.

---

## 2. Affected Files

| Action | File | Scope |
| --- | --- | --- |
| MODIFY | `apps/web/src/app/app.html` | Wrap shell in `mat-sidenav-container`; add burger button to toolbar; delete `.bottom-nav` and `.install-banner` blocks |
| MODIFY | `apps/web/src/app/app.ts` | Import sidenav module + `NavDrawerComponent`; drop `RouterLink`/`RouterLinkActive` and all `beforeinstallprompt` logic; keep focus-management effect |
| MODIFY | `apps/web/src/app/app.scss` | Remove `.bottom-nav*` / `.install-banner` rules and the 64px bottom padding; add sidenav container/drawer layout rules |
| MODIFY | `apps/web/src/app/app.spec.ts` | Update for new shell; add drawer open/close + burger a11y assertions |
| MODIFY | `apps/web/src/app/app.config.ts` | Provide `APP_VERSION` from `environment.appVersion` |
| CREATE | `apps/web/src/app/core/ui/nav-drawer/nav-drawer.component.ts` | Drawer component class (§1.5) |
| CREATE | `apps/web/src/app/core/ui/nav-drawer/nav-drawer.component.html` | Drawer markup: identity header, nav list, theme/install/about, logout |
| CREATE | `apps/web/src/app/core/ui/nav-drawer/nav-drawer.component.scss` | Drawer layout, width, safe-area insets |
| CREATE | `apps/web/src/app/core/ui/nav-drawer/nav-drawer.component.spec.ts` | Unit tests (§5) |
| CREATE | `apps/web/src/app/core/ui/theme.service.ts` | Theme preference service (§1.2) |
| CREATE | `apps/web/src/app/core/ui/theme.service.spec.ts` | Unit tests |
| CREATE | `apps/web/src/app/core/ui/pwa-install.service.ts` | Install-prompt service (§1.3) |
| CREATE | `apps/web/src/app/core/ui/pwa-install.service.spec.ts` | Unit tests |
| CREATE | `apps/web/src/app/core/auth/auth-session.service.ts` | Logout orchestration (§1.4) |
| CREATE | `apps/web/src/app/core/auth/auth-session.service.spec.ts` | Unit tests |
| CREATE | `apps/web/src/app/core/app-version.token.ts` | `APP_VERSION` injection token |
| MODIFY | `apps/web/src/environments/environment.types.ts` | Add `appVersion: string` |
| MODIFY | `apps/web/src/environments/environment.ts` | Set dev `appVersion` |
| MODIFY | `apps/web/src/environments/environment.prod.ts` | Set prod `appVersion` |
| MODIFY | `apps/web/src/styles.scss` | Extract `app-theme` mixin; add `[data-theme]` selectors |
| CREATE | `implementations/0003_burger_menu_navigation.md` | Spec-Kit registry entry (this plan, committed) |
| MODIFY | `implementations/0002_frontend_pwa.md` | Amend the navigation section: bottom nav superseded by drawer |

**Not touched:** `app.routes.ts` (destinations unchanged), `auth.store.ts`,
`auth-api.service.ts`, `libs/shared-types` (`LogoutRequest` already exists), `apps/api`.

---

## 3. Data Flow & State Transitions

### 3.1 Navigation

```
tap burger → drawer.toggle() → mat-sidenav opens (over, end), CDK focus-trap engages
tap nav link → routerLink navigates → (navigate) output → drawer.close()
              → App's NavigationEnd effect focuses #main-content
Esc / backdrop click → mat-sidenav closes → focus returns to burger button
```

The drawer's open state lives in the `mat-sidenav` template reference (`#drawer`) — no
duplicated signal in `App`, keeping a single source of truth.

### 3.2 Theme preference

```
localStorage['exercise-tracker.theme'] ──▶ preference signal ('light'|'dark'|'system')
                                                   │
                     prefers-color-scheme: dark ───┼──▶ resolvedTheme ('light'|'dark')
                                                   │
                                    effect() ──▶ <html data-theme="light|dark">
                                             ──▶ styles.scss applies mat.theme(...)
toggle(): light → dark → system → light   (each transition re-persists)
```

### 3.3 Logout

```
tap "Log out"
  → refreshToken present? ─yes─▶ POST /auth/logout  ─success─┐
  │                                └─failure (offline/401) ──┤ (swallowed)
  └─no ──────────────────────────────────────────────────────┤
                                                             ▼
                                          authStore.clear()  →  isAuthenticated() = false
                                          → toolbar + drawer disappear (@if guard)
                                          → router → /auth/login (guestGuard passes)
```

### 3.4 Install prompt

```
window 'beforeinstallprompt' → preventDefault → deferred event stored → canInstall() = true
tap "Install app" → prompt() → await userChoice → deferred cleared → canInstall() = false
                  → NotificationService.success('App installed') on 'accepted'
```

---

## 4. Edge Cases & Failure States

| # | Case | Handling |
| --- | --- | --- |
| E1 | Logout while offline | `logout()` catch swallows the HTTP error; local teardown + redirect still run. Server refresh token is orphaned until expiry — acceptable, documented in the service doc comment. |
| E2 | Logout with no refresh token in store | Skip the API call entirely; go straight to `clear()` + redirect. |
| E3 | Drawer open when session ends (401 → interceptor clears store) | The whole `mat-sidenav-container` chrome is inside the `@if (authStore.isAuthenticated())` guard, so the drawer unmounts with the toolbar; no orphaned overlay. |
| E4 | Unauthenticated routes (`/auth/*`) | Burger, toolbar and drawer are all hidden; `main` gets full height with no bottom padding. |
| E5 | `localStorage` unavailable (private mode / SSR) | `ThemeService` read/write wrapped in try/catch returning `'system'`; matches existing `readStorage` behaviour in `auth.store.ts`. |
| E6 | Browser never fires `beforeinstallprompt` (iOS Safari, already installed) | `canInstall()` stays false; the install list item is not rendered. |
| E7 | `prefers-reduced-motion` | Existing global rule in `styles.scss` already neutralises the sidenav slide transition. |
| E8 | Notch / home-indicator devices | Drawer content gets `padding-top: env(safe-area-inset-top)` and `padding-bottom: env(safe-area-inset-bottom)`; the removed `.bottom-nav` inset padding on `.app-content` is dropped. |
| E9 | Focus trap on open | Provided by `MatSidenav` (`autoFocus`); on close, focus is explicitly restored to the burger button so keyboard users are not dropped at document start (WCAG 2.4.3). |
| E10 | Content scroll lock | `mat-sidenav` in `over` mode with `[fixedInViewport]="true"` handles backdrop scroll blocking; verify the `#main-content` scroll position is preserved across open/close. |
| E11 | Very long user email in the drawer header | `text-overflow: ellipsis` + `overflow: hidden` on the identity line; full value exposed via `title` attribute. |

---

## 5. Testing Strategy (≥80% coverage on new code)

- `theme.service.spec.ts` — default is `'system'`; persisted value is restored; `toggle()`
  cycles light→dark→system; `data-theme` attribute is written; corrupt localStorage value
  falls back to `'system'`; matchMedia change updates `resolvedTheme` only while `'system'`.
- `pwa-install.service.spec.ts` — `canInstall()` flips true on a dispatched
  `beforeinstallprompt`; `install()` resolves true on `accepted` / false on `dismissed`;
  `canInstall()` returns false afterwards; `install()` with no deferred prompt resolves false.
- `auth-session.service.spec.ts` — happy path calls the API then clears + redirects; HTTP
  failure still clears + redirects (E1); missing refresh token skips the API call (E2).
- `nav-drawer.component.spec.ts` — renders the three links with correct `routerLink`s; emits
  `navigate` on link activation; hides the install entry when `canInstall()` is false; logout
  item invokes `AuthSessionService.logout()`; theme item label reflects the preference;
  version string is rendered from a stubbed `APP_VERSION`. Uses `@angular/cdk/testing`
  harnesses (`MatListItemHarness`, `MatButtonHarness`) rather than raw DOM queries.
- `app.spec.ts` — burger button is absent when unauthenticated and present when
  authenticated; clicking it opens the sidenav; `.bottom-nav` is gone; `router-outlet` and
  skip-link still render.
- Manual/a11y gate: axe pass with the drawer open and closed; keyboard-only walkthrough
  (Tab → burger → Enter → arrow through list → Esc → focus back on burger); visual check at
  360px and 430px widths.

---

## 6. Step-by-Step Implementation

1. **Commit the spec.** Create `implementations/0003_burger_menu_navigation.md` from this plan.
2. **Version plumbing.** Add `appVersion` to `Environment`, set it in `environment.ts` and
   `environment.prod.ts`, create `core/app-version.token.ts`, and provide `APP_VERSION` in
   `app.config.ts`.
3. **Theme styling.** Refactor `styles.scss` into the `app-theme($theme-type)` mixin and add
   the `html[data-theme='dark']` / `html:not([data-theme='light'])` selectors (§1.7).
4. **`ThemeService`** + spec.
5. **`PwaInstallService`** + spec; remove the `beforeinstallprompt` logic and
   `BeforeInstallPromptEvent` interface from `app.ts`.
6. **`AuthSessionService`** + spec.
7. **`NavDrawerComponent`** (ts/html/scss) wiring identity header, nav list, theme toggle,
   install entry, about line and logout; emit `navigate` on every dismissing action.
8. **`NavDrawerComponent` spec.**
9. **Shell rewrite.** Update `app.html` (sidenav container, toolbar burger, drawer host),
   `app.ts` (imports, drop router-link imports) and `app.scss` (remove bottom-nav and
   install-banner rules, drop the 64px padding, add container layout).
10. **Update `app.spec.ts`** for the new shell.
11. **Validate.** `npx nx test web` (targeted), then `npx nx lint web` and `npx nx build web`.
12. **Docs.** Amend `implementations/0002_frontend_pwa.md` to note the bottom nav is
    superseded, and update `README.md` if it describes bottom-tab navigation.

---

## 7. Open Considerations

- `appVersion` is hardcoded per environment file rather than injected at build time. A CI step
  that stamps it from `package.json` / the git SHA can follow later; out of scope here.
- Removing the bottom nav costs one tap for every navigation. Accepted per the explicit
  decision to make the drawer the sole navigation surface.
- The drawer opens from the **end (right)** side, which is the reachable thumb zone for
  right-handed one-handed use on mobile.
