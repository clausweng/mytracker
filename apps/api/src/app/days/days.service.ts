import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, between, eq, sql } from 'drizzle-orm';
import type { DayExerciseSummary, DaySession } from '@exercise-tracker/shared-types';
import { assertValidLogDate } from '../common/date.utils.js';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { daySessions, exercises, repLogs, type DaySessionRow } from '../database/schema/index.js';
import { ExercisesService } from '../exercises/exercises.service.js';

interface AggregatedRepRow {
  logDate: string;
  exerciseId: number;
  exerciseName: string;
  accumulatedReps: number;
}

/**
 * Day sessions: a "new day" is one row per (user, logDate). The day's
 * exercises are derived at read time by joining the user's standard exercises
 * with the accumulated reps logged for that date.
 */
@Injectable()
export class DaysService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly exercisesService: ExercisesService,
  ) {}

  /**
   * Creates the day session, or returns the existing one — clients may retry
   * the same request after an offline period.
   */
  async createDay(userId: string, logDate: string, now: Date = new Date()): Promise<DaySession> {
    assertValidLogDate(logDate, now);
    const session = await this.ensureDaySession(userId, logDate, now);
    return this.toDaySession(userId, session);
  }

  async getDay(userId: string, logDate: string, now: Date = new Date()): Promise<DaySession> {
    assertValidLogDate(logDate, now);
    const session = await this.findDaySession(userId, logDate);
    if (!session) {
      throw new NotFoundException(`No day session exists for ${logDate}.`);
    }

    return this.toDaySession(userId, session);
  }

  async listRange(userId: string, from: string, to: string, now: Date = new Date()): Promise<DaySession[]> {
    assertValidLogDate(from, now);
    assertValidLogDate(to, now);

    const sessions = await this.db
      .select()
      .from(daySessions)
      .where(and(eq(daySessions.userId, userId), between(daySessions.logDate, from, to)))
      .orderBy(asc(daySessions.logDate));

    if (sessions.length === 0) {
      return [];
    }

    const aggregated = await this.aggregateReps(userId, from, to);

    return sessions.map((session) => ({
      id: session.id,
      logDate: session.logDate,
      createdAt: session.createdAt.toISOString(),
      exercises: aggregated
        .filter((row) => row.logDate === session.logDate)
        .map(({ exerciseId, exerciseName, accumulatedReps }) => ({ exerciseId, exerciseName, accumulatedReps })),
    }));
  }

  /**
   * Returns the existing day session or inserts it. `onConflictDoNothing`
   * makes concurrent/retried creation safe.
   */
  async ensureDaySession(userId: string, logDate: string, now: Date = new Date()): Promise<DaySessionRow> {
    assertValidLogDate(logDate, now);

    const [inserted] = await this.db
      .insert(daySessions)
      .values({ userId, logDate })
      .onConflictDoNothing({ target: [daySessions.userId, daySessions.logDate] })
      .returning();

    if (inserted) {
      return inserted;
    }

    const existing = await this.findDaySession(userId, logDate);
    if (!existing) {
      throw new NotFoundException(`Could not create or load the day session for ${logDate}.`);
    }

    return existing;
  }

  /**
   * Accumulated reps for a single exercise on a single day.
   */
  async accumulatedReps(userId: string, logDate: string, exerciseId: number): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${repLogs.reps}), 0)::int` })
      .from(repLogs)
      .where(
        and(eq(repLogs.userId, userId), eq(repLogs.logDate, logDate), eq(repLogs.exerciseId, exerciseId)),
      );

    return row?.total ?? 0;
  }

  private async toDaySession(userId: string, session: DaySessionRow): Promise<DaySession> {
    const [standard, aggregated] = await Promise.all([
      this.exercisesService.listStandardExercises(userId),
      this.aggregateReps(userId, session.logDate, session.logDate),
    ]);

    const summaries = new Map<number, DayExerciseSummary>();
    for (const exercise of standard) {
      summaries.set(exercise.id, { exerciseId: exercise.id, exerciseName: exercise.name, accumulatedReps: 0 });
    }
    for (const row of aggregated) {
      summaries.set(row.exerciseId, {
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        accumulatedReps: row.accumulatedReps,
      });
    }

    return {
      id: session.id,
      logDate: session.logDate,
      createdAt: session.createdAt.toISOString(),
      exercises: [...summaries.values()],
    };
  }

  private async findDaySession(userId: string, logDate: string): Promise<DaySessionRow | undefined> {
    const [row] = await this.db
      .select()
      .from(daySessions)
      .where(and(eq(daySessions.userId, userId), eq(daySessions.logDate, logDate)))
      .limit(1);

    return row;
  }

  private aggregateReps(userId: string, from: string, to: string): Promise<AggregatedRepRow[]> {
    return this.db
      .select({
        logDate: repLogs.logDate,
        exerciseId: repLogs.exerciseId,
        exerciseName: exercises.name,
        accumulatedReps: sql<number>`sum(${repLogs.reps})::int`,
      })
      .from(repLogs)
      .innerJoin(exercises, eq(exercises.id, repLogs.exerciseId))
      .where(and(eq(repLogs.userId, userId), between(repLogs.logDate, from, to)))
      .groupBy(repLogs.logDate, repLogs.exerciseId, exercises.name)
      .orderBy(asc(repLogs.logDate), asc(exercises.name));
  }
}
