import { TestBed } from '@angular/core/testing';
import { UserRole } from '@exercise-tracker/shared-types';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('starts unauthenticated with no persisted session', () => {
    const store = TestBed.inject(AuthStore);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
  });

  it('becomes authenticated after setSession and persists the refresh token/user', () => {
    const store = TestBed.inject(AuthStore);
    const user = { id: 'u1', username: 'alice', displayName: 'Alice', role: UserRole.USER, createdAt: '2026-01-01' };

    store.setSession(user, 'access-1', 'refresh-1');

    expect(store.isAuthenticated()).toBe(true);
    expect(store.accessToken()).toBe('access-1');
    expect(store.refreshToken()).toBe('refresh-1');
    expect(localStorage.getItem('exercise-tracker.refreshToken')).toBe('refresh-1');
  });

  it('restores the refresh token and user from storage on a new instance', () => {
    const store = TestBed.inject(AuthStore);
    const user = { id: 'u1', username: 'alice', displayName: 'Alice', role: UserRole.USER, createdAt: '2026-01-01' };
    store.setSession(user, 'access-1', 'refresh-1');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(AuthStore);

    expect(restored.refreshToken()).toBe('refresh-1');
    expect(restored.user()).toMatchObject({ username: 'alice' });
    // Access token is never persisted; it must be re-obtained via refresh.
    expect(restored.accessToken()).toBeNull();
  });

  it('clears the session and storage on clear()', () => {
    const store = TestBed.inject(AuthStore);
    const user = { id: 'u1', username: 'alice', displayName: 'Alice', role: UserRole.USER, createdAt: '2026-01-01' };
    store.setSession(user, 'access-1', 'refresh-1');

    store.clear();

    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('exercise-tracker.refreshToken')).toBeNull();
  });
});
