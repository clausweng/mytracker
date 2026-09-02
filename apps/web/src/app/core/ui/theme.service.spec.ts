import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeService } from './theme.service';

const THEME_KEY = 'exercise-tracker.theme';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to "system" when nothing is persisted', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
  });

  it('restores a persisted preference', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('dark');
    expect(service.resolvedTheme()).toBe('dark');
  });

  it('falls back to "system" for a corrupt persisted value', () => {
    localStorage.setItem(THEME_KEY, 'not-a-theme');
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('system');
  });

  it('cycles light -> dark -> system -> light', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('light');
    expect(service.preference()).toBe('light');

    service.toggle();
    expect(service.preference()).toBe('dark');

    service.toggle();
    expect(service.preference()).toBe('system');

    service.toggle();
    expect(service.preference()).toBe('light');
  });

  it('persists the preference to localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });

  it('writes the resolved theme onto <html data-theme>', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('dark');
    TestBed.tick();
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });
});
