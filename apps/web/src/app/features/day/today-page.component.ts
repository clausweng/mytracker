import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { DayFacade } from './day.facade';
import { AddRepsSheetComponent } from './add-reps-sheet.component';
import { NotificationService } from '../../core/ui/notification.service';

@Component({
  selector: 'app-today-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './today-page.component.html',
  styleUrl: './today-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TodayPageComponent {
  protected readonly facade = inject(DayFacade);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly notifications = inject(NotificationService);

  constructor() {
    void this.facade.loadToday();
  }

  async startNewDay(): Promise<void> {
    try {
      await this.facade.startNewDay();
      this.notifications.success('New day started!');
    } catch {
      this.notifications.error('Could not start a new day. Please try again.');
    }
  }

  openAddReps(exerciseId: number, exerciseName: string): void {
    const ref = this.bottomSheet.open(AddRepsSheetComponent, { data: { exerciseName } });
    ref.afterDismissed().subscribe((reps) => {
      if (typeof reps === 'number' && reps > 0) {
        void this.facade.addReps(exerciseId, exerciseName, reps);
      }
    });
  }
}
