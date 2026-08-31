import { Injectable, inject, signal } from '@angular/core';
import type { Exercise, ExerciseStatus, UserExercise } from '@exercise-tracker/shared-types';
import { ExercisesOfflineRepository } from '../../core/offline/exercises-offline.repository';
import { UserExercisesOfflineRepository } from '../../core/offline/user-exercises-offline.repository';
import type { CachedUserExercise } from '../../core/offline/tracker-db';
import { ExerciseApiService } from './exercise-api.service';

/**
 * Facade combining the offline exercise cache with the network API:
 * autocomplete/search reads the cache first (works offline) then refreshes
 * from the network; the standard-exercise list is cached for offline display.
 */
@Injectable({ providedIn: 'root' })
export class ExercisesFacade {
  private readonly api = inject(ExerciseApiService);
  private readonly exercisesRepo = inject(ExercisesOfflineRepository);
  private readonly userExercisesRepo = inject(UserExercisesOfflineRepository);

  readonly myExercises = signal<CachedUserExercise[]>([]);
  readonly loadingMyExercises = signal(false);

  async search(query: string): Promise<Exercise[]> {
    const cached = await this.exercisesRepo.search(query);
    try {
      const fresh = await this.api.search(query);
      await this.exercisesRepo.putMany(fresh);
      return fresh;
    } catch {
      return cached;
    }
  }

  async submitExercise(name: string, description?: string): Promise<Exercise> {
    const exercise = await this.api.create({ name, description });
    await this.exercisesRepo.put(exercise);
    return exercise;
  }

  async loadMyExercises(): Promise<void> {
    this.loadingMyExercises.set(true);
    try {
      const [userExercises, cached] = await Promise.all([
        this.api.listUserExercises().catch(() => null),
        this.userExercisesRepo.getAll(),
      ]);

      if (!userExercises) {
        this.myExercises.set(cached);
        return;
      }

      const denormalized = await this.denormalize(userExercises);
      await this.userExercisesRepo.replaceAll(denormalized);
      this.myExercises.set(denormalized);
    } finally {
      this.loadingMyExercises.set(false);
    }
  }

  async addStandardExercise(exercise: Exercise): Promise<void> {
    const added = await this.api.addUserExercise({ exerciseId: exercise.id, isStandard: true });
    const entry: CachedUserExercise = {
      exerciseId: added.exerciseId,
      exerciseName: exercise.name,
      isStandard: added.isStandard,
      sortOrder: added.sortOrder,
    };
    await this.userExercisesRepo.put(entry);
    this.myExercises.update((list) => [...list, entry]);
  }

  async removeExercise(exerciseId: number): Promise<void> {
    await this.api.removeUserExercise(exerciseId);
    await this.userExercisesRepo.remove(exerciseId);
    this.myExercises.update((list) => list.filter((entry) => entry.exerciseId !== exerciseId));
  }

  private async denormalize(userExercises: UserExercise[]): Promise<CachedUserExercise[]> {
    const results: CachedUserExercise[] = [];
    for (const userExercise of userExercises) {
      const exercise = await this.resolveExerciseName(userExercise.exerciseId);
      results.push({
        exerciseId: userExercise.exerciseId,
        exerciseName: exercise,
        isStandard: userExercise.isStandard,
        sortOrder: userExercise.sortOrder,
      });
    }
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private async resolveExerciseName(exerciseId: number): Promise<string> {
    const cached = await this.exercisesRepo.get(exerciseId);
    return cached?.name ?? `Exercise #${exerciseId}`;
  }
}

// re-export for template narrowing convenience
export type { ExerciseStatus };
