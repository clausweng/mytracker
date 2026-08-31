import { BadRequestException } from '@nestjs/common';
import { StatsPeriod } from '@exercise-tracker/shared-types';
import { PeriodService } from './period.service.js';
import { StatsService } from './stats.service.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const USER_ID = '88888888-8888-4888-8888-888888888888';
const NOW = new Date('2026-08-31T10:00:00.000Z');

describe('PeriodService', () => {
  const service = new PeriodService();

  it('resolves WEEK to the inclusive last seven days', () => {
    expect(service.resolve(StatsPeriod.WEEK, undefined, NOW)).toEqual({ from: '2026-08-25', to: '2026-08-31' });
  });

  it('resolves MONTH to the same day one month back', () => {
    expect(service.resolve(StatsPeriod.MONTH, undefined, NOW)).toEqual({ from: '2026-07-31', to: '2026-08-31' });
  });

  it('clamps MONTH to the last day of a shorter month', () => {
    expect(service.resolve(StatsPeriod.MONTH, undefined, new Date('2026-03-31T00:00:00.000Z'))).toEqual({
      from: '2026-02-28',
      to: '2026-03-31',
    });
  });

  it('resolves YEAR to the same day one year back', () => {
    expect(service.resolve(StatsPeriod.YEAR, undefined, NOW)).toEqual({ from: '2025-08-31', to: '2026-08-31' });
  });

  it('resolves SINCE to the supplied start date', () => {
    expect(service.resolve(StatsPeriod.SINCE, '2026-01-01', NOW)).toEqual({ from: '2026-01-01', to: '2026-08-31' });
  });

  it('rejects SINCE without a start date', () => {
    expect(() => service.resolve(StatsPeriod.SINCE, undefined, NOW)).toThrow(BadRequestException);
  });

  it('rejects a future SINCE date', () => {
    expect(() => service.resolve(StatsPeriod.SINCE, '2026-09-01', NOW)).toThrow(BadRequestException);
  });

  it('rejects an unknown period', () => {
    expect(() => service.resolve('QUARTER' as StatsPeriod, undefined, NOW)).toThrow(BadRequestException);
  });

  it.each([
    [StatsPeriod.WEEK, 'day'],
    [StatsPeriod.MONTH, 'week'],
    [StatsPeriod.YEAR, 'month'],
    [StatsPeriod.SINCE, 'month'],
  ])('buckets %s by %s', (period, bucket) => {
    expect(service.bucketFor(period)).toBe(bucket);
  });
});

describe('StatsService', () => {
  let drizzle: DrizzleMock;
  let service: StatsService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    service = new StatsService(drizzle.db, new PeriodService());
  });

  it('maps the aggregated summary rows onto the contract', async () => {
    drizzle.queue([
      { exerciseId: 1, exerciseName: 'Push-ups', totalReps: 420 },
      { exerciseId: 2, exerciseName: 'Squats', totalReps: 210 },
    ]);

    const response = await service.summary(USER_ID, { period: StatsPeriod.WEEK }, NOW);

    expect(response).toEqual({
      period: StatsPeriod.WEEK,
      from: '2026-08-25',
      to: '2026-08-31',
      entries: [
        { exerciseId: 1, exerciseName: 'Push-ups', totalReps: 420 },
        { exerciseId: 2, exerciseName: 'Squats', totalReps: 210 },
      ],
    });
    expect(drizzle.calls.filter((call) => call.method === 'groupBy')).toHaveLength(1);
  });

  it('adds an exercise filter when requested', async () => {
    drizzle.queue([]);

    const response = await service.summary(USER_ID, { period: StatsPeriod.MONTH, exerciseId: 3 }, NOW);

    expect(response.entries).toEqual([]);
    expect(drizzle.calls.some((call) => call.method === 'where')).toBe(true);
  });

  it('maps the bucketed timeseries rows onto the contract', async () => {
    drizzle.queue([
      { bucket: '2026-08-30', totalReps: 60 },
      { bucket: '2026-08-31', totalReps: 40 },
    ]);

    const response = await service.timeseries(USER_ID, { period: StatsPeriod.WEEK }, NOW);

    expect(response).toEqual({
      period: StatsPeriod.WEEK,
      points: [
        { bucket: '2026-08-30', totalReps: 60 },
        { bucket: '2026-08-31', totalReps: 40 },
      ],
    });
  });

  it('propagates the period validation error', async () => {
    await expect(service.timeseries(USER_ID, { period: StatsPeriod.SINCE }, NOW)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
