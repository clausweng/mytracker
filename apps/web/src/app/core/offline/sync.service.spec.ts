import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SyncEntryStatus } from '@exercise-tracker/shared-types';
import { SyncService } from './sync.service';
import { OutboxRepository } from './outbox.repository';
import { deleteTrackerDb } from './tracker-db';
import { API_BASE_URL } from '../http/api-base-url.token';

describe('SyncService', () => {
  let httpMock: HttpTestingController;
  let outbox: OutboxRepository;
  let sync: SyncService;

  beforeEach(async () => {
    await deleteTrackerDb();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: '/api/v1' }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    outbox = TestBed.inject(OutboxRepository);
    sync = TestBed.inject(SyncService);
    // The constructor kicks off an initial refreshPendingCount() and an
    // effect-driven flush() over the (empty) outbox; let both settle before
    // each test enqueues its own entries, otherwise the constructor's flush
    // can race with the test's explicit flush() and double-post.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => httpMock.verify());

  it('does nothing when the outbox is empty', async () => {
    await sync.flush();
    expect(sync.pendingCount()).toBe(0);
  });

  it('removes successfully synced entries and updates the pending count', async () => {
    await outbox.enqueue({ clientLogId: 'a', exerciseId: 1, reps: 10, logDate: '2026-01-01', clientTimestamp: 1 });

    const flushPromise = sync.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = httpMock.expectOne('/api/v1/logs/sync');
    req.flush({ results: [{ clientLogId: 'a', status: SyncEntryStatus.CREATED }] });
    await flushPromise;

    expect(await outbox.listAll()).toEqual([]);
    expect(sync.pendingCount()).toBe(0);
  });

  it('records a failure and keeps the entry queued when the request errors', async () => {
    await outbox.enqueue({ clientLogId: 'a', exerciseId: 1, reps: 10, logDate: '2026-01-01', clientTimestamp: 1 });

    const flushPromise = sync.flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const req = httpMock.expectOne('/api/v1/logs/sync');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Network error' });
    await flushPromise;

    const [entry] = await outbox.listAll();
    expect(entry.attempts).toBe(1);
    expect(sync.pendingCount()).toBe(1);
  });
});
