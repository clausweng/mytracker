import { Inject, Injectable } from '@nestjs/common';
import { and, asc, between, desc, eq, sql, type SQL } from 'drizzle-orm';
import type {
  StatsSummaryQuery,
  StatsSummaryResponse,
  StatsTimeseriesQuery,
  StatsTimeseriesResponse,
} from '@exercise-tracker/shared-types';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { exercises, repLogs } from '../database/schema/index.js';
import { PeriodService } from './period.service.js';

/**
 * Read-only aggregations over `rep_logs`.
 */
@Injectable()
export class StatsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly periodService: PeriodService,
  ) {}

  async summary(userId: string, query: StatsSummaryQuery, now: Date = new Date()): Promise<StatsSummaryResponse> {
    const { from, to } = this.periodService.resolve(query.period, query.since, now);

    const rows = await this.db
      .select({
        exerciseId: repLogs.exerciseId,
        exerciseName: exercises.name,
        totalReps: sql<number>`sum(${repLogs.reps})::int`,
      })
      .from(repLogs)
      .innerJoin(exercises, eq(exercises.id, repLogs.exerciseId))
      .where(this.scope(userId, from, to, query.exerciseId))
      .groupBy(repLogs.exerciseId, exercises.name)
      .orderBy(desc(sql`sum(${repLogs.reps})`));

    return {
      period: query.period,
      from,
      to,
      entries: rows.map((row) => ({
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        totalReps: row.totalReps,
      })),
    };
  }

  async timeseries(
    userId: string,
    query: StatsTimeseriesQuery,
    now: Date = new Date(),
  ): Promise<StatsTimeseriesResponse> {
    const { from, to } = this.periodService.resolve(query.period, query.since, now);
    const bucket = this.periodService.bucketFor(query.period);
    // `bucket` comes from a closed enum mapping, never from user input.
    const bucketExpression = sql<string>`to_char(date_trunc(${sql.raw(`'${bucket}'`)}, ${repLogs.logDate}::timestamp), 'YYYY-MM-DD')`;

    const rows = await this.db
      .select({ bucket: bucketExpression, totalReps: sql<number>`sum(${repLogs.reps})::int` })
      .from(repLogs)
      .where(this.scope(userId, from, to, query.exerciseId))
      .groupBy(bucketExpression)
      .orderBy(asc(bucketExpression));

    return {
      period: query.period,
      points: rows.map((row) => ({ bucket: row.bucket, totalReps: row.totalReps })),
    };
  }

  private scope(userId: string, from: string, to: string, exerciseId?: number): SQL | undefined {
    const filters = [eq(repLogs.userId, userId), between(repLogs.logDate, from, to)];
    if (exerciseId !== undefined) {
      filters.push(eq(repLogs.exerciseId, exerciseId));
    }

    return and(...filters);
  }
}
