import { Injectable } from '@angular/core';
import type { Exercise } from '@exercise-tracker/shared-types';
import { openTrackerDb } from './tracker-db';

/**
 * Typed CRUD helpers over the `exercises` IndexedDB store, used to serve
 * autocomplete and "my exercises" screens offline.
 */
@Injectable({ providedIn: 'root' })
export class ExercisesOfflineRepository {
  async putMany(exercises: Exercise[]): Promise<void> {
    const db = await openTrackerDb();
    const tx = db.transaction('exercises', 'readwrite');
    await Promise.all(exercises.map((exercise) => tx.store.put(exercise)));
    await tx.done;
  }

  async put(exercise: Exercise): Promise<void> {
    const db = await openTrackerDb();
    await db.put('exercises', exercise);
  }

  async getAll(): Promise<Exercise[]> {
    const db = await openTrackerDb();
    return db.getAll('exercises');
  }

  async search(query: string): Promise<Exercise[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    const all = await this.getAll();
    return all.filter((exercise) => exercise.name.toLowerCase().includes(normalized));
  }

  async get(id: number): Promise<Exercise | undefined> {
    const db = await openTrackerDb();
    return db.get('exercises', id);
  }
}
