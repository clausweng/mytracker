import { Injectable } from '@angular/core';
import { openTrackerDb, type CachedDay } from './tracker-db';

/** Typed CRUD helpers over the `days` IndexedDB store. */
@Injectable({ providedIn: 'root' })
export class DaysOfflineRepository {
  async put(day: CachedDay): Promise<void> {
    const db = await openTrackerDb();
    await db.put('days', day);
  }

  async get(logDate: string): Promise<CachedDay | undefined> {
    const db = await openTrackerDb();
    return db.get('days', logDate);
  }

  async listRange(from: string, to: string): Promise<CachedDay[]> {
    const db = await openTrackerDb();
    const all = await db.getAll('days');
    return all
      .filter((day) => day.logDate >= from && day.logDate <= to)
      .sort((a, b) => a.logDate.localeCompare(b.logDate));
  }
}
