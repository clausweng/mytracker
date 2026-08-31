import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import type { Exercise } from '@exercise-tracker/shared-types';
import { ExercisesFacade } from './exercises.facade';
import { SubmitExerciseDialogComponent } from './submit-exercise-dialog.component';
import { NotificationService } from '../../core/ui/notification.service';

@Component({
  selector: 'app-exercises-page',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    DragDropModule,
  ],
  templateUrl: './exercises-page.component.html',
  styleUrl: './exercises-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExercisesPageComponent {
  protected readonly facade = inject(ExercisesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchResults = signal<Exercise[]>([]);

  constructor() {
    this.facade.loadMyExercises();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => void this.runSearch(query));
  }

  private async runSearch(query: string): Promise<void> {
    if (!query || query.trim().length === 0) {
      this.searchResults.set([]);
      return;
    }
    const results = await this.facade.search(query);
    this.searchResults.set(results);
  }

  displayExerciseName(exercise?: Exercise): string {
    return exercise?.name ?? '';
  }

  async onExerciseSelected(event: MatAutocompleteSelectedEvent): Promise<void> {
    const exercise = event.option.value as Exercise;
    try {
      await this.facade.addStandardExercise(exercise);
      this.notifications.success(`${exercise.name} added to your list.`);
      this.searchControl.setValue('');
    } catch {
      this.notifications.error('Could not add that exercise. Try again.');
    }
  }

  openSubmitDialog(): void {
    const ref = this.dialog.open(SubmitExerciseDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      void this.submitNewExercise(result.name, result.description);
    });
  }

  private async submitNewExercise(name: string, description?: string): Promise<void> {
    try {
      const exercise = await this.facade.submitExercise(name, description);
      this.notifications.success(`"${exercise.name}" submitted for approval.`);
    } catch {
      this.notifications.error('Could not submit the exercise. It may already exist.');
    }
  }

  async removeExercise(exerciseId: number): Promise<void> {
    try {
      await this.facade.removeExercise(exerciseId);
    } catch {
      this.notifications.error('Could not remove the exercise.');
    }
  }

  drop(event: CdkDragDrop<unknown>): void {
    const list = [...this.facade.myExercises()];
    moveItemInArray(list, event.previousIndex, event.currentIndex);
    const reordered = list.map((entry, index) => ({ ...entry, sortOrder: index }));
    this.facade.myExercises.set(reordered);
    // Persisting the new sortOrder to the API is out of scope for this increment;
    // the reorder is kept locally/offline until the API exposes a reorder endpoint.
  }
}
