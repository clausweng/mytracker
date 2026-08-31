import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Thin wrapper around `MatSnackBar` so components never inject it directly. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  info(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 4000 });
  }

  success(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 3000, panelClass: 'notification-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Dismiss', { duration: 6000, panelClass: 'notification-error' });
  }
}
