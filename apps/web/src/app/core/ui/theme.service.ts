import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'exercise-tracker.theme';
const CYCLE: readonly ThemePreference[] = ['light', 'dark', 'system'];

/**
 * Owns the user's light/dark theme preference. Persists the choice, resolves
 * `'system'` against `prefers-color-scheme`, and reflects the resolved theme
 * onto `<html data-theme>` so `styles.scss` can apply the matching palette.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>(readPreference());
  private readonly systemPrefersDarkSignal = signal<boolean>(readSystemPrefersDark());

  readonly preference = this.preferenceSignal.asReadonly();

  readonly resolvedTheme = computed<'light' | 'dark'>(() => {
    const preference = this.preferenceSignal();
    return preference === 'system' ? (this.systemPrefersDarkSignal() ? 'dark' : 'light') : preference;
  });

  constructor() {
    // Reflect the resolved theme onto the document so `styles.scss` applies it.
    effect(() => {
      const resolved = this.resolvedTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.dataset['theme'] = resolved;
      }
    });

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (event: MediaQueryListEvent): void => {
        this.systemPrefersDarkSignal.set(event.matches);
      };
      media.addEventListener('change', listener);
    }
  }


  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    writePreference(preference);
  }

  /** Cycles light → dark → system → light. */
  toggle(): void {
    const currentIndex = CYCLE.indexOf(this.preferenceSignal());
    const next = CYCLE[(currentIndex + 1) % CYCLE.length];
    this.setPreference(next);
  }
}

function readPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw;
    }
  } catch {
    // Storage unavailable (private browsing) — fall through to default.
  }
  return 'system';
}

function writePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    // Ignore — preference stays in-memory only for this tab.
  }
}

function readSystemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  } catch {
    return false;
  }
}
