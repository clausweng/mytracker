import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRole } from '@exercise-tracker/shared-types';
import { authGuard, guestGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('authGuard / guestGuard', () => {
  let authStore: AuthStore;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
  });

  function runGuard(guard: typeof authGuard): unknown {
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  }

  it('authGuard allows access when authenticated', () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'token',
      'refresh',
    );

    expect(runGuard(authGuard)).toBe(true);
  });

  it('authGuard redirects to login when not authenticated', () => {
    const result = runGuard(authGuard);

    expect(result).toEqual(router.createUrlTree(['/auth/login']));
  });

  it('guestGuard allows access when not authenticated', () => {
    expect(runGuard(guestGuard)).toBe(true);
  });

  it('guestGuard redirects to today when already authenticated', () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'token',
      'refresh',
    );

    const result = runGuard(guestGuard);

    expect(result).toEqual(router.createUrlTree(['/today']));
  });
});
