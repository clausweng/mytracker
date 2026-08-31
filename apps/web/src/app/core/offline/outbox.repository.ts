import { Injectable } from '@angular/core';
import { openTrackerDb, type OutboxEntry } from './tracker-db';
import type { LogEntryContract } from '@exercise-tracker/shared-types';

/** Typed CRUD helpers over the `outbox` IndexedDB store (pending offline rep logs). */
@Injectable({ providedIn: 'root' })
export class OutboxRepository {
  async enqueue(entry: LogEntryContract): Promise<void> {
    const db = await openTrackerDb();
    const outboxEntry: OutboxEntry = { ...entry, queuedAt: Date.now(), attempts: 0 };
    await db.put('outbox', outboxEntry);
  }

  async remove(clientLogId: string): Promise<void> {
    const db = await openTrackerDb();
    await db.delete('outbox', clientLogId);
  }

  async recordFailure(clientLogId: string, error: string): Promise<void> {
    const db = await openTrackerDb();
    const entry = await db.get('outbox', clientLogId);
    if (!entry) {
      return;
    }
    entry.attempts += 1;
    entry.lastError = error;
    await db.put('outbox', entry);
  }

  async listAll(): Promise<OutboxEntry[]> {
    const db = await openTrackerDb();
    const entries = await db.getAllFromIndex('outbox', 'by-queued-at');
    return entries;
  }

  async count(): Promise<number> {
    const db = await openTrackerDb();
    return db.count('outbox');
  }
}
