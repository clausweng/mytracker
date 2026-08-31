import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { AuthStore } from '../../core/auth/auth.store';
import { NotificationService } from '../../core/ui/notification.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly step = signal<'username' | 'reset'>('username');
  protected readonly submitting = signal(false);
  protected readonly hintQuestion = signal<string | null>(null);

  protected readonly usernameForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
  });

  protected readonly resetForm = this.formBuilder.nonNullable.group({
    hintAnswer: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  async lookupHint(): Promise<void> {
    if (this.usernameForm.invalid || this.submitting()) {
      this.usernameForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const { hintQuestion } = await this.authApi.getHintQuestion(this.usernameForm.getRawValue().username);
      this.hintQuestion.set(hintQuestion);
      this.step.set('reset');
    } catch {
      this.notifications.error('No account found for that username.');
    } finally {
      this.submitting.set(false);
    }
  }

  async resetPassword(): Promise<void> {
    if (this.resetForm.invalid || this.submitting()) {
      this.resetForm.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      const { hintAnswer, newPassword } = this.resetForm.getRawValue();
      const response = await this.authApi.resetPassword({
        username: this.usernameForm.getRawValue().username,
        hintAnswer,
        newPassword,
      });
      this.authStore.setSession(response.user, response.accessToken, response.refreshToken);
      this.notifications.success('Password updated. You are now logged in.');
      await this.router.navigateByUrl('/today');
    } catch {
      this.notifications.error('That answer did not match our records.');
    } finally {
      this.submitting.set(false);
    }
  }
}
