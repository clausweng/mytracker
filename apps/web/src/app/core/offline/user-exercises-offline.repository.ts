import { Injectable } from '@angular/core';
import { openTrackerDb, type CachedUserExercise } from './tracker-db';


/** Typed CRUD helpers over the `userExercises` IndexedDB store (the user's standard list). */
@Injectable({ providedIn: 'root' })
export class UserExercisesOfflineRepository {
  async replaceAll(entries: CachedUserExercise[]): Promise<void> {
    const db = await openTrackerDb();
    const tx = db.transaction('userExercises', 'readwrite');
    await tx.store.clear();
    await Promise.all(entries.map((entry) => tx.store.put(entry)));
    await tx.done;
  }

  async put(entry: CachedUserExercise): Promise<void> {
    const db = await openTrackerDb();
    await db.put('userExercises', entry);
  }

  async remove(exerciseId: number): Promise<void> {
    const db = await openTrackerDb();
    await db.delete('userExercises', exerciseId);
  }

  async getAll(): Promise<CachedUserExercise[]> {
    const db = await openTrackerDb();
    const entries = await db.getAll('userExercises');
    return entries.sort((a, b) => a.sortOrder - b.sortOrder);
  }
}
