import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule, type MatSidenav } from '@angular/material/sidenav';
import { ConnectivityService } from './core/ui/connectivity.service';
import { AuthStore } from './core/auth/auth.store';
import { SyncService } from './core/offline/sync.service';
import { NavDrawerComponent } from './core/ui/nav-drawer/nav-drawer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule, MatSidenavModule, NavDrawerComponent],
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
  private readonly drawer = viewChild<MatSidenav>('drawer');
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  constructor() {
    // Move focus to the main landmark on every route change for screen-reader
    // and keyboard users (WCAG 2.4.3 focus order).
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.mainContent()?.nativeElement.focus());
  }

  async toggleDrawer(): Promise<void> {
    await this.drawer()?.toggle();
  }

  async closeDrawer(): Promise<void> {
    await this.drawer()?.close();
  }

  focusMenuButton(): void {
    this.menuButton()?.nativeElement.focus();
  }
}
