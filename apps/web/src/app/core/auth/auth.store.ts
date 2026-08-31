import { Injectable, computed, signal } from '@angular/core';
import type { UserProfile } from '@exercise-tracker/shared-types';

const REFRESH_TOKEN_KEY = 'exercise-tracker.refreshToken';
const USER_KEY = 'exercise-tracker.user';

/**
 * Holds the authenticated session in signals. The access token lives only in
 * memory for the lifetime of the tab; the refresh token and user profile are
 * persisted to `localStorage` so a reload can silently restore the session
 * via a refresh call.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly refreshTokenSignal = signal<string | null>(readStorage(REFRESH_TOKEN_KEY));
  private readonly userSignal = signal<UserProfile | null>(readJsonStorage<UserProfile>(USER_KEY));

  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly refreshToken = this.refreshTokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null && this.refreshTokenSignal() !== null);

  setSession(user: UserProfile, accessToken: string, refreshToken: string): void {
    this.accessTokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
    this.userSignal.set(user);
    writeStorage(REFRESH_TOKEN_KEY, refreshToken);
    writeJsonStorage(USER_KEY, user);
  }

  updateAccessToken(accessToken: string): void {
    this.accessTokenSignal.set(accessToken);
  }

  clear(): void {
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.userSignal.set(null);
    removeStorage(REFRESH_TOKEN_KEY);
    removeStorage(USER_KEY);
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private browsing, quota) — session stays in-memory only.
  }
}

function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function readJsonStorage<T>(key: string): T | null {
  const raw = readStorage(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  writeStorage(key, JSON.stringify(value));
}
