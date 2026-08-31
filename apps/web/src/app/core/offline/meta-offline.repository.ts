import { Injectable } from '@angular/core';
import { openTrackerDb } from './tracker-db';

/** Typed CRUD helpers over the `meta` IndexedDB store (e.g. last-sync timestamps). */
@Injectable({ providedIn: 'root' })
export class MetaOfflineRepository {
  async get<T>(key: string): Promise<T | undefined> {
    const db = await openTrackerDb();
    const entry = await db.get('meta', key);
    return entry?.value as T | undefined;
  }

  async set(key: string, value: unknown): Promise<void> {
    const db = await openTrackerDb();
    await db.put('meta', { key, value });
  }
}
