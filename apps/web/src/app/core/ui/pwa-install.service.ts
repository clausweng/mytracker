import { Injectable, signal } from '@angular/core';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Owns the deferred `beforeinstallprompt` browser event so `App` stays a thin shell. */
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly deferredPromptSignal = signal<BeforeInstallPromptEvent | null>(null);
  private readonly canInstallSignal = signal(false);

  readonly canInstall = this.canInstallSignal.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferredPromptSignal.set(event as BeforeInstallPromptEvent);
        this.canInstallSignal.set(true);
      });
    }
  }

  /** Shows the deferred install prompt. Resolves `true` if the user accepted it. */
  async install(): Promise<boolean> {
    const promptEvent = this.deferredPromptSignal();
    if (!promptEvent) {
      return false;
    }
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    this.deferredPromptSignal.set(null);
    this.canInstallSignal.set(false);
    return outcome === 'accepted';
  }
}
