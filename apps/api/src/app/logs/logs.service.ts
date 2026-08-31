import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  SyncEntryStatus,
  type CreateLogResponse,
  type LogEntryContract,
  type SyncEntryResult,
  type SyncLogsResponse,
} from '@exercise-tracker/shared-types';
import { assertValidLogDate } from '../common/date.utils.js';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { repLogs } from '../database/schema/index.js';
import { DaysService } from '../days/days.service.js';

interface ExistingEntry {
  clientTimestamp: number;
}

/**
 * Rep logging, including the offline-safe batch sync. Every write is keyed on
 * `(userId, clientLogId)` so retried syncs never double-count reps.
 */
@Injectable()
export class LogsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly daysService: DaysService,
  ) {}

  /**
   * Logs reps for a single exercise, auto-creating the day session, and
   * returns the day's new accumulated total for that exercise.
   */
  async create(userId: string, entry: LogEntryContract, now: Date = new Date()): Promise<CreateLogResponse> {
    assertValidLogDate(entry.logDate, now);
    const session = await this.daysService.ensureDaySession(userId, entry.logDate, now);
    await this.upsert(userId, session.id, entry);

    return {
      logDate: entry.logDate,
      exerciseId: entry.exerciseId,
      accumulatedReps: await this.daysService.accumulatedReps(userId, entry.logDate, entry.exerciseId),
    };
  }

  async remove(userId: string, logId: string): Promise<void> {
    const deleted = await this.db
      .delete(repLogs)
      .where(and(eq(repLogs.id, logId), eq(repLogs.userId, userId)))
      .returning({ id: repLogs.id });

    if (deleted.length === 0) {
      throw new NotFoundException(`Log ${logId} does not exist or does not belong to you.`);
    }
  }

  /**
   * Batch upsert used by offline clients. Conflicts on `(userId, clientLogId)`
   * are resolved last-write-wins on `clientTimestamp`; stale entries are
   * reported as `IGNORED` and never applied.
   */
  async sync(userId: string, entries: readonly LogEntryContract[], now: Date = new Date()): Promise<SyncLogsResponse> {
    for (const entry of entries) {
      assertValidLogDate(entry.logDate, now);
    }

    const known = await this.findExisting(
      userId,
      entries.map((entry) => entry.clientLogId),
    );
    const sessionIds = new Map<string, string>();
    const results: SyncEntryResult[] = [];

    for (const entry of entries) {
      const prior = known.get(entry.clientLogId);
      if (prior && entry.clientTimestamp < prior.clientTimestamp) {
        results.push({ clientLogId: entry.clientLogId, status: SyncEntryStatus.IGNORED });
        continue;
      }

      let daySessionId = sessionIds.get(entry.logDate);
      if (!daySessionId) {
        daySessionId = (await this.daysService.ensureDaySession(userId, entry.logDate, now)).id;
        sessionIds.set(entry.logDate, daySessionId);
      }

      await this.upsert(userId, daySessionId, entry);
      results.push({
        clientLogId: entry.clientLogId,
        status: prior ? SyncEntryStatus.UPDATED : SyncEntryStatus.CREATED,
      });
      known.set(entry.clientLogId, { clientTimestamp: entry.clientTimestamp });
    }

    return { results };
  }

  private async upsert(userId: string, daySessionId: string, entry: LogEntryContract): Promise<void> {
    await this.db
      .insert(repLogs)
      .values({
        userId,
        exerciseId: entry.exerciseId,
        daySessionId,
        clientLogId: entry.clientLogId,
        reps: entry.reps,
        logDate: entry.logDate,
        clientTimestamp: entry.clientTimestamp,
      })
      .onConflictDoUpdate({
        target: [repLogs.userId, repLogs.clientLogId],
        set: {
          exerciseId: entry.exerciseId,
          daySessionId,
          reps: entry.reps,
          logDate: entry.logDate,
          clientTimestamp: entry.clientTimestamp,
        },
        // Last-write-wins guard: never let a stale replay overwrite newer data.
        setWhere: sql`${repLogs.clientTimestamp} <= ${entry.clientTimestamp}`,
      });
  }

  private async findExisting(userId: string, clientLogIds: readonly string[]): Promise<Map<string, ExistingEntry>> {
    if (clientLogIds.length === 0) {
      return new Map();
    }

    const rows = await this.db
      .select({ clientLogId: repLogs.clientLogId, clientTimestamp: repLogs.clientTimestamp })
      .from(repLogs)
      .where(and(eq(repLogs.userId, userId), inArray(repLogs.clientLogId, [...clientLogIds])));

    return new Map(rows.map((row) => [row.clientLogId, { clientTimestamp: row.clientTimestamp }]));
  }
}
