import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { PwaInstallService, type BeforeInstallPromptEvent } from './pwa-install.service';

function dispatchBeforeInstallPrompt(userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>): void {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & BeforeInstallPromptEvent;
  event.prompt = () => Promise.resolve();
  event.userChoice = userChoice;
  window.dispatchEvent(event);
}

describe('PwaInstallService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('reports canInstall = false until the browser fires beforeinstallprompt', () => {
    const service = TestBed.inject(PwaInstallService);
    expect(service.canInstall()).toBe(false);
  });

  it('flips canInstall to true when beforeinstallprompt fires', () => {
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt(Promise.resolve({ outcome: 'accepted' }));
    expect(service.canInstall()).toBe(true);
  });

  it('resolves true and clears canInstall when the user accepts', async () => {
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt(Promise.resolve({ outcome: 'accepted' }));

    const accepted = await service.install();

    expect(accepted).toBe(true);
    expect(service.canInstall()).toBe(false);
  });

  it('resolves false when the user dismisses the prompt', async () => {
    const service = TestBed.inject(PwaInstallService);
    dispatchBeforeInstallPrompt(Promise.resolve({ outcome: 'dismissed' }));

    const accepted = await service.install();

    expect(accepted).toBe(false);
    expect(service.canInstall()).toBe(false);
  });

  it('resolves false when install() is called with no deferred prompt', async () => {
    const service = TestBed.inject(PwaInstallService);
    const accepted = await service.install();
    expect(accepted).toBe(false);
  });
});
