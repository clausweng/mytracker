import { DBSchema, IDBPDatabase, openDB } from 'idb';
import type {
  DayExerciseSummary,
  Exercise,
  LogEntryContract,
} from '@exercise-tracker/shared-types';

/**
 * A cached day session with its exercise totals, keyed by `logDate`
 * (`YYYY-MM-DD`, local time — see `LogDate`).
 */
export interface CachedDay {
  id: string;
  logDate: string;
  exercises: DayExerciseSummary[];
  createdAt: string;
  updatedAt: number;
}

/** A user's own exercise list entry, denormalized with the exercise name for offline display. */
export interface CachedUserExercise {
  exerciseId: number;
  exerciseName: string;
  isStandard: boolean;
  sortOrder: number;
}

/** A pending rep log waiting to be flushed to `POST /logs/sync`. */
export interface OutboxEntry extends LogEntryContract {
  queuedAt: number;
  attempts: number;
  lastError?: string;
}

/** Arbitrary single-row metadata, e.g. last successful sync timestamp. */
export interface MetaEntry {
  key: string;
  value: unknown;
}

export interface TrackerDbSchema extends DBSchema {
  exercises: {
    key: number;
    value: Exercise;
    indexes: { 'by-name': string };
  };
  userExercises: {
    key: number;
    value: CachedUserExercise;
  };
  days: {
    key: string;
    value: CachedDay;
  };
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { 'by-queued-at': number };
  };
  meta: {
    key: string;
    value: MetaEntry;
  };
}

const DB_NAME = 'exercise-tracker';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TrackerDbSchema>> | undefined;

/**
 * Opens (and lazily creates) the app's IndexedDB database. Safe to call
 * repeatedly — the connection is memoized per browser tab.
 */
export function openTrackerDb(): Promise<IDBPDatabase<TrackerDbSchema>> {
  dbPromise ??= openDB<TrackerDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('exercises')) {
        const store = db.createObjectStore('exercises', { keyPath: 'id' });
        store.createIndex('by-name', 'name');
      }
      if (!db.objectStoreNames.contains('userExercises')) {
        db.createObjectStore('userExercises', { keyPath: 'exerciseId' });
      }
      if (!db.objectStoreNames.contains('days')) {
        db.createObjectStore('days', { keyPath: 'logDate' });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const store = db.createObjectStore('outbox', { keyPath: 'clientLogId' });
        store.createIndex('by-queued-at', 'queuedAt');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
  return dbPromise;
}

/** Test-only helper to reset the memoized connection between specs. */
export function resetTrackerDbConnection(): void {
  dbPromise = undefined;
}

/** Test-only helper to fully delete the underlying database between specs. */
export async function deleteTrackerDb(): Promise<void> {
  const db = await dbPromise;
  db?.close();
  dbPromise = undefined;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
