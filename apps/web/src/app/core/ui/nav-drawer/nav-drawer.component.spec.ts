import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserRole } from '@exercise-tracker/shared-types';
import { NavDrawerComponent } from './nav-drawer.component';
import { AuthStore } from '../../auth/auth.store';
import { AuthSessionService } from '../../auth/auth-session.service';
import { PwaInstallService } from '../pwa-install.service';
import { ThemeService } from '../theme.service';
import { APP_VERSION } from '../../app-version.token';

@Component({ selector: 'app-test-route', template: '' })
class TestRouteComponent {}

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.includes(text));
}

describe('NavDrawerComponent', () => {
  let authStore: AuthStore;
  let logoutSpy: ReturnType<typeof vi.spyOn>;
  let installSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NavDrawerComponent],
      providers: [
        provideRouter([
          { path: 'today', component: TestRouteComponent },
          { path: 'exercises', component: TestRouteComponent },
          { path: 'stats', component: TestRouteComponent },
        ]),
        { provide: APP_VERSION, useValue: '1.2.3' },
      ],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'Ada Lovelace', role: UserRole.USER, createdAt: '2026-01-01' },
      'access-token',
      'refresh-token',
    );

    logoutSpy = vi.spyOn(TestBed.inject(AuthSessionService), 'logout').mockResolvedValue(undefined);
    installSpy = vi.spyOn(TestBed.inject(PwaInstallService), 'install').mockResolvedValue(true);
  });

  it('renders the three primary navigation links', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a[routerLink="/today"]')).toBeTruthy();
    expect(compiled.querySelector('a[routerLink="/exercises"]')).toBeTruthy();
    expect(compiled.querySelector('a[routerLink="/stats"]')).toBeTruthy();
    expect(compiled.textContent).toContain('Today');
    expect(compiled.textContent).toContain('Exercises');
    expect(compiled.textContent).toContain('Stats');
  });

  it('emits navigate when a nav link is activated', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const navigateSpy = vi.fn();
    fixture.componentInstance.navigate.subscribe(navigateSpy);

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLAnchorElement>('a[routerLink="/today"]')?.click();

    expect(navigateSpy).toHaveBeenCalled();
  });

  it('hides the install entry when the browser has no deferred prompt', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(findButtonByText(compiled, 'Install app')).toBeUndefined();
  });

  it('shows the identity header with the user display name', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Ada Lovelace');
  });

  it('shows the app version in the about line', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('1.2.3');
  });

  it('reflects the theme preference label', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    TestBed.inject(ThemeService).setPreference('dark');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Dark');
  });

  it('invokes AuthSessionService.logout() when "Log out" is clicked', () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    findButtonByText(compiled, 'Log out')?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('calls PwaInstallService.install() when "Install app" is clicked', async () => {
    const fixture = TestBed.createComponent(NavDrawerComponent);
    window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    findButtonByText(compiled, 'Install app')?.click();
    await fixture.whenStable();

    expect(installSpy).toHaveBeenCalled();
  });
});
