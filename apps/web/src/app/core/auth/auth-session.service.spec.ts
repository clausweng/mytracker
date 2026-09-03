import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserRole } from '@exercise-tracker/shared-types';
import { AuthSessionService } from './auth-session.service';
import { AuthStore } from './auth.store';

@Component({ selector: 'app-test-login', template: '' })
class TestLoginComponent {}

describe('AuthSessionService', () => {
  let authStore: AuthStore;
  let router: Router;
  let httpMock: HttpTestingController;
  let service: AuthSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'auth/login', component: TestLoginComponent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => httpMock.verify());

  function seedSession(): void {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'access-token',
      'refresh-token',
    );
  }

  it('calls the logout API, clears the store, and redirects on the happy path', async () => {
    seedSession();

    const logoutPromise = service.logout();

    const req = httpMock.expectOne('/api/v1/auth/logout');
    expect(req.request.body).toEqual({ refreshToken: 'refresh-token' });
    req.flush(null);

    await logoutPromise;

    expect(authStore.isAuthenticated()).toBe(false);
    expect(router.url).toBe('/auth/login');
  });

  it('still clears the store and redirects when the API call fails (offline)', async () => {
    seedSession();

    const logoutPromise = service.logout();

    const req = httpMock.expectOne('/api/v1/auth/logout');
    req.error(new ProgressEvent('network error'));

    await logoutPromise;

    expect(authStore.isAuthenticated()).toBe(false);
    expect(router.url).toBe('/auth/login');
  });

  it('skips the API call when there is no refresh token', async () => {
    await service.logout();

    httpMock.expectNone('/api/v1/auth/logout');
    expect(authStore.isAuthenticated()).toBe(false);
    expect(router.url).toBe('/auth/login');
  });
});
