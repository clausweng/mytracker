import { Injectable, effect, inject, signal } from '@angular/core';
import { SyncEntryStatus, type LogEntryContract } from '@exercise-tracker/shared-types';
import { ConnectivityService } from '../ui/connectivity.service';
import { OutboxRepository } from './outbox.repository';
import { LogsApiService } from '../../features/day/logs-api.service';

const MAX_ATTEMPTS_BEFORE_BACKOFF_LOG = 5;

/** Strips outbox-only bookkeeping fields so the API's whitelist validation accepts the payload. */
function toLogEntryContract(entry: LogEntryContract): LogEntryContract {
  const { clientLogId, exerciseId, reps, logDate, clientTimestamp } = entry;
  return { clientLogId, exerciseId, reps, logDate, clientTimestamp };
}

/**
 * Flushes the offline outbox through the idempotent `POST /logs/sync`
 * endpoint. Triggered on app init, whenever connectivity is regained, and
 * can be called directly after a local write. Only one flush runs at a time.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private readonly connectivity = inject(ConnectivityService);
  private readonly outbox = inject(OutboxRepository);
  private readonly logsApi = inject(LogsApiService);

  readonly pendingCount = signal(0);
  readonly syncing = signal(false);

  constructor() {
    this.refreshPendingCount();
    effect(() => {
      if (this.connectivity.online()) {
        void this.flush();
      }
    });
  }

  async refreshPendingCount(): Promise<void> {
    this.pendingCount.set(await this.outbox.count());
  }

  async flush(): Promise<void> {
    if (this.syncing() || !this.connectivity.online()) {
      return;
    }

    const entries = await this.outbox.listAll();
    if (entries.length === 0) {
      await this.refreshPendingCount();
      return;
    }

    this.syncing.set(true);
    try {
      const response = await this.logsApi.sync(entries.map(toLogEntryContract));
      for (const result of response.results) {
        if (result.status === SyncEntryStatus.IGNORED) {
          await this.outbox.recordFailure(result.clientLogId, 'Rejected by server (ignored).');
          continue;
        }
        await this.outbox.remove(result.clientLogId);
      }
    } catch (error) {
      for (const entry of entries) {
        if (entry.attempts < MAX_ATTEMPTS_BEFORE_BACKOFF_LOG) {
          await this.outbox.recordFailure(entry.clientLogId, toErrorMessage(error));
        }
      }
    } finally {
      this.syncing.set(false);
      await this.refreshPendingCount();
    }
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown sync error';
}
