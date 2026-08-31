import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatBottomSheetModule, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface AddRepsSheetData {
  exerciseName: string;
}

const PRESET_REPS = [5, 10, 20];

@Component({
  selector: 'app-add-reps-sheet',
  imports: [ReactiveFormsModule, MatBottomSheetModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="sheet">
      <h2>{{ data.exerciseName }}</h2>
      <p>How many reps did you do?</p>

      <div class="presets">
        @for (preset of presets; track preset) {
          <button mat-stroked-button type="button" (click)="submit(preset)">+{{ preset }}</button>
        }
      </div>

      <form [formGroup]="form" (ngSubmit)="submitCustom()" novalidate>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Custom amount</mat-label>
          <input matInput type="number" inputmode="numeric" min="1" formControlName="reps" required />
        </mat-form-field>
        <button mat-flat-button color="primary" class="full-width" type="submit" [disabled]="form.invalid">
          Add reps
        </button>
      </form>
    </div>
  `,
  styles: `
    .sheet {
      padding: 1rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom));
    }
    .presets {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .presets button {
      flex: 1;
      min-height: var(--app-touch-target);
    }
    .full-width {
      width: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRepsSheetComponent {
  protected readonly data = inject<AddRepsSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly bottomSheetRef = inject(MatBottomSheetRef<AddRepsSheetComponent, number>);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly presets = PRESET_REPS;
  protected readonly form = this.formBuilder.nonNullable.group({
    reps: [10, [Validators.required, Validators.min(1)]],
  });

  submit(reps: number): void {
    this.bottomSheetRef.dismiss(reps);
  }

  submitCustom(): void {
    if (this.form.invalid) {
      return;
    }
    this.bottomSheetRef.dismiss(this.form.getRawValue().reps);
  }
}
