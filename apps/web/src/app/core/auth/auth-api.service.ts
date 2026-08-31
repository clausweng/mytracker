import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type {
  AuthResponse,
  HintQuestionResponse,
  LoginRequest,
  LogoutRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@exercise-tracker/shared-types';
import { API_BASE_URL } from '../http/api-base-url.token';

/** Thin HTTP wrapper over the `/auth` endpoints; contracts from shared-types. */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  register(request: RegisterRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, request));
  }

  login(request: LoginRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, request));
  }

  refresh(request: RefreshRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.baseUrl}/auth/refresh`, request));
  }

  logout(request: LogoutRequest): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.baseUrl}/auth/logout`, request));
  }

  getHintQuestion(username: string): Promise<HintQuestionResponse> {
    return firstValueFrom(
      this.http.get<HintQuestionResponse>(`${this.baseUrl}/auth/hint/${encodeURIComponent(username)}`),
    );
  }

  resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    return firstValueFrom(this.http.post<AuthResponse>(`${this.baseUrl}/auth/reset-password`, request));
  }

  /** Full-page navigation to start an OAuth flow; the API issues the provider redirect. */
  oauthStartUrl(provider: 'google' | 'facebook'): string {
    return `${this.baseUrl}/auth/${provider}`;
  }
}
