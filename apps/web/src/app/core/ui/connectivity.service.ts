import { Injectable, signal } from '@angular/core';

/**
 * Tracks browser online/offline state via `navigator.onLine` and the
 * `online`/`offline` window events, exposed as a signal for the shell banner
 * and the sync engine's trigger.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineSignal = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly online = this.onlineSignal.asReadonly();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('online', () => this.onlineSignal.set(true));
    window.addEventListener('offline', () => this.onlineSignal.set(false));
  }
}
