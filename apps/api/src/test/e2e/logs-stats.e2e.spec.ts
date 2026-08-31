import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  SyncEntryStatus,
  type AuthResponse,
  type CreateLogResponse,
  type DaySession,
  type Exercise,
  type StatsSummaryResponse,
  type SyncLogsResponse,
} from '@exercise-tracker/shared-types';
import { exercises } from '../../app/database/schema/index.js';
import { API, cleanupE2eApp, createE2eApp, uniqueUsername, type E2eContext } from './e2e.harness.js';

const LOG_DATE = new Date().toISOString().slice(0, 10);

describe('Logs sync, days and stats (e2e)', () => {
  let context: E2eContext;
  let accessToken: string;
  let pushUpsId: number;

  beforeAll(async () => {
    context = await createE2eApp();

    const registered = await request(context.app.getHttpServer())
      .post(`${API}/auth/register`)
      .send({
        username: uniqueUsername(context),
        password: 'super-secret-password',
        displayName: 'Sync User',
        hintQuestion: 'First pet?',
        hintAnswer: 'Rex',
      })
      .expect(201);
    accessToken = (registered.body as AuthResponse).accessToken;

    const [seeded] = await context.db.select().from(exercises).where(eq(exercises.slug, 'push-ups')).limit(1);
    pushUpsId = seeded.id;
  });

  afterAll(async () => {
    await cleanupE2eApp(context);
  });

  it('finds seeded exercises through autocomplete and manages the personal list', async () => {
    const server = context.app.getHttpServer();

    const found = await request(server)
      .get(`${API}/exercises`)
      .query({ query: 'push' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((found.body as Exercise[]).some((exercise) => exercise.id === pushUpsId)).toBe(true);

    await request(server)
      .post(`${API}/users/me/exercises`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ exerciseId: pushUpsId, isStandard: true, sortOrder: 1 })
      .expect(201);

    await request(server)
      .get(`${API}/users/me/exercises`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([{ exerciseId: pushUpsId, isStandard: true, sortOrder: 1 }]);
      });
  });

  it('does not double-count reps when the same sync batch is replayed', async () => {
    const server = context.app.getHttpServer();
    const entries = [
      { clientLogId: randomUUID(), exerciseId: pushUpsId, reps: 20, logDate: LOG_DATE, clientTimestamp: Date.now() },
      { clientLogId: randomUUID(), exerciseId: pushUpsId, reps: 15, logDate: LOG_DATE, clientTimestamp: Date.now() },
    ];

    const first = await request(server)
      .post(`${API}/logs/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ entries })
      .expect(200);
    expect((first.body as SyncLogsResponse).results.map((result) => result.status)).toEqual([
      SyncEntryStatus.CREATED,
      SyncEntryStatus.CREATED,
    ]);

    const replay = await request(server)
      .post(`${API}/logs/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ entries })
      .expect(200);
    expect((replay.body as SyncLogsResponse).results.map((result) => result.status)).toEqual([
      SyncEntryStatus.UPDATED,
      SyncEntryStatus.UPDATED,
    ]);

    const stale = await request(server)
      .post(`${API}/logs/sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ entries: [{ ...entries[0], reps: 999, clientTimestamp: 1 }] })
      .expect(200);
    expect((stale.body as SyncLogsResponse).results[0].status).toBe(SyncEntryStatus.IGNORED);

    const day = await request(server)
      .get(`${API}/days/${LOG_DATE}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const summary = (day.body as DaySession).exercises.find((entry) => entry.exerciseId === pushUpsId);
    expect(summary?.accumulatedReps).toBe(35);
  });

  it('creates the day session automatically for a single log and reports the running total', async () => {
    const response = await request(context.app.getHttpServer())
      .post(`${API}/logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientLogId: randomUUID(),
        exerciseId: pushUpsId,
        reps: 5,
        logDate: LOG_DATE,
        clientTimestamp: Date.now(),
      })
      .expect(201);

    expect(response.body as CreateLogResponse).toEqual({
      logDate: LOG_DATE,
      exerciseId: pushUpsId,
      accumulatedReps: 40,
    });
  });

  it('rejects a log date too far in the future', async () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

    await request(context.app.getHttpServer())
      .post(`${API}/logs`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientLogId: randomUUID(),
        exerciseId: pushUpsId,
        reps: 5,
        logDate: future,
        clientTimestamp: Date.now(),
      })
      .expect(400);
  });

  it('aggregates the weekly stats summary and timeseries', async () => {
    const server = context.app.getHttpServer();

    const summary = await request(server)
      .get(`${API}/stats/summary`)
      .query({ period: 'WEEK' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const body = summary.body as StatsSummaryResponse;
    expect(body.period).toBe('WEEK');
    expect(body.entries).toEqual([{ exerciseId: pushUpsId, exerciseName: 'Push-ups', totalReps: 40 }]);

    await request(server)
      .get(`${API}/stats/timeseries`)
      .query({ period: 'WEEK' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect(({ body: timeseries }) => {
        expect(timeseries).toEqual({ period: 'WEEK', points: [{ bucket: LOG_DATE, totalReps: 40 }] });
      });

    await request(server)
      .get(`${API}/stats/summary`)
      .query({ period: 'SINCE' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('lists the day range including the accumulated reps', async () => {
    const response = await request(context.app.getHttpServer())
      .get(`${API}/days`)
      .query({ from: LOG_DATE, to: LOG_DATE })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect((response.body as DaySession[])[0].exercises).toEqual([
      { exerciseId: pushUpsId, exerciseName: 'Push-ups', accumulatedReps: 40 },
    ]);
  });
});
