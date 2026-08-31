import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, filter, from, switchMap, take, throwError } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AuthStore } from './auth.store';

let refreshInFlight: BehaviorSubject<string | null | undefined> | null = null;

/**
 * Attaches the bearer access token to every request and transparently
 * refreshes it on a 401, queuing concurrent requests behind a single
 * in-flight refresh call so we never fire multiple refreshes at once.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const authApi = inject(AuthApiService);

  const authorizedReq = withAuthHeader(req, authStore.accessToken());

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      const refreshToken = authStore.refreshToken();
      if (!refreshToken) {
        authStore.clear();
        return throwError(() => error);
      }

      return refreshAccessToken(authApi, authStore, refreshToken).pipe(
        switchMap((newAccessToken) => {
          if (!newAccessToken) {
            return throwError(() => error);
          }
          return next(withAuthHeader(req, newAccessToken));
        }),
      );
    }),
  );
};

function withAuthHeader(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token || isAuthEndpoint(req.url)) {
    return req;
  }
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
}

function refreshAccessToken(
  authApi: AuthApiService,
  authStore: AuthStore,
  refreshToken: string,
): Observable<string | null> {
  if (refreshInFlight) {
    return refreshInFlight.pipe(
      filter((value) => value !== undefined),
      take(1),
    );
  }

  refreshInFlight = new BehaviorSubject<string | null | undefined>(undefined);
  const subject = refreshInFlight;

  from(authApi.refresh({ refreshToken }))
    .pipe(
      catchError(() => {
        authStore.clear();
        return from([null]);
      }),
    )
    .subscribe((response) => {
      if (response && typeof response === 'object' && 'accessToken' in response) {
        authStore.setSession(response.user, response.accessToken, response.refreshToken);
        subject.next(response.accessToken);
      } else {
        subject.next(null);
      }
      subject.complete();
      refreshInFlight = null;
    });

  return subject.pipe(
    filter((value) => value !== undefined),
    take(1),
  );
}
