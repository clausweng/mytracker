import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExerciseStatus, type Exercise } from '@exercise-tracker/shared-types';
import { DaysService } from './days.service.js';
import type { ExercisesService } from '../exercises/exercises.service.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const USER_ID = '55555555-5555-4555-8555-555555555555';
const NOW = new Date('2026-08-31T10:00:00.000Z');

const SESSION_ROW = {
  id: 'day-session-id',
  userId: USER_ID,
  logDate: '2026-08-31',
  createdAt: new Date('2026-08-31T06:00:00.000Z'),
};

function standardExercise(id: number, name: string): Exercise {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    description: null,
    status: ExerciseStatus.APPROVED,
    createdByUserId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('DaysService', () => {
  let drizzle: DrizzleMock;
  let exercisesService: { listStandardExercises: jest.Mock };
  let service: DaysService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    exercisesService = { listStandardExercises: jest.fn().mockResolvedValue([]) };
    service = new DaysService(drizzle.db, exercisesService as unknown as ExercisesService);
  });

  describe('log date validation', () => {
    it('rejects a malformed date', async () => {
      await expect(service.createDay(USER_ID, '31-08-2026', NOW)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an impossible calendar date', async () => {
      await expect(service.createDay(USER_ID, '2026-02-31', NOW)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a date beyond the clock-skew margin', async () => {
      await expect(service.createDay(USER_ID, '2026-09-03', NOW)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts tomorrow (clock-skew margin)', async () => {
      drizzle.queue([{ ...SESSION_ROW, logDate: '2026-09-01' }], []);

      await expect(service.createDay(USER_ID, '2026-09-01', NOW)).resolves.toMatchObject({ logDate: '2026-09-01' });
    });
  });

  describe('createDay', () => {
    it('snapshots the standard exercises with zero reps', async () => {
      exercisesService.listStandardExercises.mockResolvedValue([
        standardExercise(1, 'Push-ups'),
        standardExercise(2, 'Squats'),
      ]);
      drizzle.queue([SESSION_ROW], []);

      const day = await service.createDay(USER_ID, '2026-08-31', NOW);

      expect(day).toEqual({
        id: 'day-session-id',
        logDate: '2026-08-31',
        createdAt: '2026-08-31T06:00:00.000Z',
        exercises: [
          { exerciseId: 1, exerciseName: 'Push-ups', accumulatedReps: 0 },
          { exerciseId: 2, exerciseName: 'Squats', accumulatedReps: 0 },
        ],
      });
      expect(drizzle.calls.some((call) => call.method === 'onConflictDoNothing')).toBe(true);
    });

    it('is idempotent: returns the existing session when the insert conflicts', async () => {
      drizzle.queue([], [SESSION_ROW], []);

      const day = await service.createDay(USER_ID, '2026-08-31', NOW);

      expect(day.id).toBe('day-session-id');
      expect(drizzle.select).toHaveBeenCalled();
    });

    it('fails loudly when neither insert nor lookup yields a session', async () => {
      drizzle.queue([], []);

      await expect(service.createDay(USER_ID, '2026-08-31', NOW)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getDay', () => {
    it('merges accumulated reps over the standard exercises', async () => {
      exercisesService.listStandardExercises.mockResolvedValue([standardExercise(1, 'Push-ups')]);
      drizzle.queue(
        [SESSION_ROW],
        [
          { logDate: '2026-08-31', exerciseId: 1, exerciseName: 'Push-ups', accumulatedReps: 45 },
          { logDate: '2026-08-31', exerciseId: 7, exerciseName: 'Dips', accumulatedReps: 12 },
        ],
      );

      const day = await service.getDay(USER_ID, '2026-08-31', NOW);

      expect(day.exercises).toEqual([
        { exerciseId: 1, exerciseName: 'Push-ups', accumulatedReps: 45 },
        { exerciseId: 7, exerciseName: 'Dips', accumulatedReps: 12 },
      ]);
    });

    it('404s when the day was never started', async () => {
      drizzle.queue([]);

      await expect(service.getDay(USER_ID, '2026-08-30', NOW)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listRange', () => {
    it('groups the aggregated reps per day session', async () => {
      drizzle.queue(
        [SESSION_ROW, { ...SESSION_ROW, id: 'other', logDate: '2026-08-30' }],
        [
          { logDate: '2026-08-30', exerciseId: 1, exerciseName: 'Push-ups', accumulatedReps: 10 },
          { logDate: '2026-08-31', exerciseId: 2, exerciseName: 'Squats', accumulatedReps: 20 },
        ],
      );

      const days = await service.listRange(USER_ID, '2026-08-01', '2026-08-31', NOW);

      expect(days).toHaveLength(2);
      expect(days[0].exercises).toEqual([{ exerciseId: 2, exerciseName: 'Squats', accumulatedReps: 20 }]);
      expect(days[1].exercises).toEqual([{ exerciseId: 1, exerciseName: 'Push-ups', accumulatedReps: 10 }]);
    });

    it('short-circuits when the range holds no sessions', async () => {
      drizzle.queue([]);

      await expect(service.listRange(USER_ID, '2026-08-01', '2026-08-31', NOW)).resolves.toEqual([]);
      expect(drizzle.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('accumulatedReps', () => {
    it('returns the summed reps', async () => {
      drizzle.queue([{ total: 75 }]);

      await expect(service.accumulatedReps(USER_ID, '2026-08-31', 1)).resolves.toBe(75);
    });

    it('returns zero when nothing was logged', async () => {
      drizzle.queue([]);

      await expect(service.accumulatedReps(USER_ID, '2026-08-31', 1)).resolves.toBe(0);
    });
  });
});
