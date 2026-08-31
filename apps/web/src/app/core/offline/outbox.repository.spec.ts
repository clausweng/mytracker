import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import type { LogEntryContract } from '@exercise-tracker/shared-types';
import { OutboxRepository } from './outbox.repository';
import { deleteTrackerDb } from './tracker-db';

function buildEntry(overrides: Partial<LogEntryContract> = {}): LogEntryContract {
  return {
    clientLogId: 'client-1',
    exerciseId: 1,
    reps: 10,
    logDate: '2026-01-01',
    clientTimestamp: Date.now(),
    ...overrides,
  };
}

describe('OutboxRepository', () => {
  let repository: OutboxRepository;

  beforeEach(async () => {
    await deleteTrackerDb();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(OutboxRepository);
  });

  it('enqueues and lists entries ordered by queue time', async () => {
    await repository.enqueue(buildEntry({ clientLogId: 'a' }));
    await repository.enqueue(buildEntry({ clientLogId: 'b' }));

    const entries = await repository.listAll();

    expect(entries.map((entry) => entry.clientLogId)).toEqual(['a', 'b']);
    expect(await repository.count()).toBe(2);
  });

  it('removes an entry once synced', async () => {
    await repository.enqueue(buildEntry({ clientLogId: 'a' }));

    await repository.remove('a');

    expect(await repository.listAll()).toEqual([]);
  });

  it('records failed sync attempts without removing the entry', async () => {
    await repository.enqueue(buildEntry({ clientLogId: 'a' }));

    await repository.recordFailure('a', 'network error');

    const [entry] = await repository.listAll();
    expect(entry.attempts).toBe(1);
    expect(entry.lastError).toBe('network error');
  });
});
