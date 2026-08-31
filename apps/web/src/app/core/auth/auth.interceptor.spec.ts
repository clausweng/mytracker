import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserRole } from '@exercise-tracker/shared-types';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => httpMock.verify());

  it('attaches the bearer token to outgoing requests', () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'access-token',
      'refresh-token',
    );

    httpClient.get('/api/v1/days/2026-01-01').subscribe();

    const req = httpMock.expectOne('/api/v1/days/2026-01-01');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
    req.flush({});
  });

  it('does not attach a header when there is no access token', () => {
    httpClient.get('/api/v1/days/2026-01-01').subscribe();

    const req = httpMock.expectOne('/api/v1/days/2026-01-01');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('refreshes the access token on 401 and retries the original request', async () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'stale-token',
      'refresh-token',
    );

    const resultPromise = new Promise((resolve) => {
      httpClient.get('/api/v1/days/2026-01-01').subscribe((body) => resolve(body));
    });

    const firstReq = httpMock.expectOne('/api/v1/days/2026-01-01');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer stale-token');
    firstReq.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/v1/auth/refresh');
    refreshReq.flush({
      accessToken: 'fresh-token',
      refreshToken: 'refresh-token-2',
      user: { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
    });
    await flushMicrotasks();

    const retriedReq = httpMock.expectOne('/api/v1/days/2026-01-01');
    expect(retriedReq.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retriedReq.flush({ ok: true });

    expect(await resultPromise).toEqual({ ok: true });
  });

  it('clears the session and propagates the error when there is no refresh token', async () => {
    const errorPromise = new Promise((resolve) => {
      httpClient.get('/api/v1/days/2026-01-01').subscribe({ error: (error) => resolve(error) });
    });

    const req = httpMock.expectOne('/api/v1/days/2026-01-01');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await errorPromise;
    expect(authStore.isAuthenticated()).toBe(false);
  });
});
