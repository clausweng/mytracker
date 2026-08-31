import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ConnectivityService } from './core/ui/connectivity.service';
import { AuthStore } from './core/auth/auth.store';
import { SyncService } from './core/offline/sync.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly connectivity = inject(ConnectivityService);
  protected readonly authStore = inject(AuthStore);
  protected readonly sync = inject(SyncService);

  private readonly router = inject(Router);
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  protected readonly deferredInstallPrompt = signal<BeforeInstallPromptEvent | null>(null);

  constructor() {
    // Move focus to the main landmark on every route change for screen-reader
    // and keyboard users (WCAG 2.4.3 focus order).
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.mainContent()?.nativeElement.focus());

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        this.deferredInstallPrompt.set(event as BeforeInstallPromptEvent);
      });
    }
  }

  async installApp(): Promise<void> {
    const promptEvent = this.deferredInstallPrompt();
    if (!promptEvent) {
      return;
    }
    await promptEvent.prompt();
    await promptEvent.userChoice;
    this.deferredInstallPrompt.set(null);
  }
}
