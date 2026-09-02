import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApiService } from './auth-api.service';
import { AuthStore } from './auth.store';

/**
 * Orchestrates logout: best-effort server-side session revocation, followed
 * by an unconditional local teardown and redirect. The local session is
 * always cleared, even if the API call fails (offline, expired token), so a
 * user can never be stuck signed-in with no way to log out.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    const refreshToken = this.authStore.refreshToken();
    if (refreshToken) {
      try {
        await this.authApi.logout({ refreshToken });
      } catch {
        // Swallow — the server session is best-effort revoked; local
        // teardown below always proceeds regardless of network state.
      }
    }
    this.authStore.clear();
    await this.router.navigateByUrl('/auth/login');
  }
}
