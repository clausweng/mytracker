import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserRole } from '@exercise-tracker/shared-types';
import 'fake-indexeddb/auto';
import { App } from './app';
import { AuthStore } from './core/auth/auth.store';
import { APP_VERSION } from './core/app-version.token';

describe('App', () => {
  let authStore: AuthStore;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_VERSION, useValue: '0.0.0-test' },
      ],
    }).compileComponents();
    authStore = TestBed.inject(AuthStore);
  });

  it('creates the shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('does not render the burger menu when unauthenticated', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button[aria-label="Open navigation menu"]')).toBeNull();
  });

  it('renders the burger menu and no bottom nav when authenticated', async () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'access-token',
      'refresh-token',
    );

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('button[aria-label="Open navigation menu"]')).toBeTruthy();
    expect(compiled.querySelector('.bottom-nav')).toBeNull();
  });

  it('opens the sidenav when the burger button is clicked', async () => {
    authStore.setSession(
      { id: 'u1', username: 'a', displayName: 'A', role: UserRole.USER, createdAt: '2026-01-01' },
      'access-token',
      'refresh-token',
    );

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    compiled.querySelector<HTMLButtonElement>('button[aria-label="Open navigation menu"]')?.click();
    await fixture.whenStable();

    expect(compiled.querySelector('mat-sidenav.mat-drawer-opened')).toBeTruthy();
  });
});
