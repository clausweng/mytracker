import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AuthStore } from '../../auth/auth.store';
import { AuthSessionService } from '../../auth/auth-session.service';
import { ThemeService, type ThemePreference } from '../theme.service';
import { PwaInstallService } from '../pwa-install.service';
import { APP_VERSION } from '../../app-version.token';

const THEME_ICON: Record<ThemePreference, string> = {
  light: 'light_mode',
  dark: 'dark_mode',
  system: 'brightness_auto',
};

const THEME_LABEL: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

/**
 * Primary navigation surface, hosted inside the app shell's `mat-sidenav`.
 * Emits `navigate` after any action that should close the drawer (link
 * activation, install, logout) so the host doesn't need to know how each
 * item behaves.
 */
@Component({
  selector: 'app-nav-drawer',
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './nav-drawer.component.html',
  styleUrl: './nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavDrawerComponent {
  protected readonly authStore = inject(AuthStore);
  protected readonly theme = inject(ThemeService);
  protected readonly pwaInstall = inject(PwaInstallService);
  protected readonly appVersion = inject(APP_VERSION);

  private readonly authSession = inject(AuthSessionService);

  protected readonly displayName = computed(() => this.authStore.user()?.displayName ?? 'Account');
  protected readonly themeIcon = computed(() => THEME_ICON[this.theme.preference()]);
  protected readonly themeLabel = computed(() => THEME_LABEL[this.theme.preference()]);

  readonly navigate = output<void>();

  toggleTheme(): void {
    this.theme.toggle();
  }

  async install(): Promise<void> {
    await this.pwaInstall.install();
    this.navigate.emit();
  }

  async logout(): Promise<void> {
    this.navigate.emit();
    await this.authSession.logout();
  }
}
