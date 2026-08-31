import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExerciseStatus } from '@exercise-tracker/shared-types';
import { ExercisesService } from './exercises.service.js';
import { slugify, uniqueSlug } from './exercise.mapper.js';
import type { ExerciseRow } from '../database/schema/index.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const USER_ID = '33333333-3333-4333-8333-333333333333';

function buildExercise(overrides: Partial<ExerciseRow> = {}): ExerciseRow {
  return {
    id: 1,
    name: 'Push-ups',
    slug: 'push-ups',
    description: 'Standard push-up.',
    status: 'APPROVED',
    createdByUserId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('slug helpers', () => {
  it.each([
    ['Kettlebell Swings', 'kettlebell-swings'],
    ['  Pull-ups!! ', 'pull-ups'],
    ['***', 'exercise'],
  ])('slugifies %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('suffixes colliding slugs', () => {
    expect(uniqueSlug('squats', [])).toBe('squats');
    expect(uniqueSlug('squats', ['squats'])).toBe('squats-2');
    expect(uniqueSlug('squats', ['squats', 'squats-2'])).toBe('squats-3');
  });
});

describe('ExercisesService', () => {
  let drizzle: DrizzleMock;
  let service: ExercisesService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    service = new ExercisesService(drizzle.db);
  });

  describe('search', () => {
    it('applies the visibility filter and maps rows to the contract', async () => {
      drizzle.queue([buildExercise(), buildExercise({ id: 2, name: 'Mine', status: 'PENDING', createdByUserId: USER_ID })]);

      const result = await service.search(USER_ID, 'p');

      expect(drizzle.select).toHaveBeenCalledTimes(1);
      expect(drizzle.calls.some((call) => call.method === 'where')).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        name: 'Push-ups',
        slug: 'push-ups',
        description: 'Standard push-up.',
        status: ExerciseStatus.APPROVED,
        createdByUserId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      expect(result[1].status).toBe(ExerciseStatus.PENDING);
    });

    it('returns an empty list when nothing matches', async () => {
      drizzle.queue([]);

      await expect(service.search(USER_ID, 'zzz')).resolves.toEqual([]);
    });
  });

  it('lists the exercises created by the user', async () => {
    drizzle.queue([buildExercise({ status: 'PENDING', createdByUserId: USER_ID })]);

    const result = await service.listMine(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].createdByUserId).toBe(USER_ID);
  });

  describe('create', () => {
    it('creates a PENDING exercise with a collision-free slug', async () => {
      drizzle.queue(
        [],
        [{ slug: 'squats' }, { slug: 'squats-2' }],
        [buildExercise({ id: 9, name: 'Squats', slug: 'squats-3', status: 'PENDING', createdByUserId: USER_ID })],
      );

      const created = await service.create(USER_ID, { name: '  Squats ', description: ' Air squat ' });

      const values = drizzle.calls.find((call) => call.method === 'values')?.args[0] as {
        name: string;
        slug: string;
        status: string;
        description: string | null;
        createdByUserId: string;
      };
      expect(values).toEqual({
        name: 'Squats',
        slug: 'squats-3',
        description: 'Air squat',
        status: 'PENDING',
        createdByUserId: USER_ID,
      });
      expect(created.status).toBe(ExerciseStatus.PENDING);
    });

    it('stores a null description when none is supplied', async () => {
      drizzle.queue([], [], [buildExercise({ id: 10, status: 'PENDING', createdByUserId: USER_ID })]);

      await service.create(USER_ID, { name: 'Burpees' });

      const values = drizzle.calls.find((call) => call.method === 'values')?.args[0] as { description: string | null };
      expect(values.description).toBeNull();
    });

    it('rejects a duplicate name', async () => {
      drizzle.queue([buildExercise()]);

      await expect(service.create(USER_ID, { name: 'Push-ups' })).rejects.toBeInstanceOf(ConflictException);
      expect(drizzle.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('moderates an exercise', async () => {
      drizzle.queue([buildExercise({ status: 'APPROVED' })]);

      await expect(service.updateStatus(1, ExerciseStatus.APPROVED)).resolves.toMatchObject({
        id: 1,
        status: ExerciseStatus.APPROVED,
      });
    });

    it('404s for an unknown exercise', async () => {
      drizzle.queue([]);

      await expect(service.updateStatus(404, ExerciseStatus.REJECTED)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('user exercise list', () => {
    it('lists the entries ordered by sort order', async () => {
      drizzle.queue([{ userId: USER_ID, exerciseId: 3, isStandard: true, sortOrder: 1 }]);

      await expect(service.listUserExercises(USER_ID)).resolves.toEqual([
        { exerciseId: 3, isStandard: true, sortOrder: 1 },
      ]);
    });

    it('adds a visible exercise, defaulting the optional fields', async () => {
      drizzle.queue([buildExercise()], [{ userId: USER_ID, exerciseId: 1, isStandard: false, sortOrder: 0 }]);

      await expect(service.addUserExercise(USER_ID, { exerciseId: 1 })).resolves.toEqual({
        exerciseId: 1,
        isStandard: false,
        sortOrder: 0,
      });

      const values = drizzle.calls.find((call) => call.method === 'values')?.args[0];
      expect(values).toEqual({ userId: USER_ID, exerciseId: 1, isStandard: false, sortOrder: 0 });
    });

    it('upserts an existing entry with the supplied flags', async () => {
      drizzle.queue([buildExercise()], [{ userId: USER_ID, exerciseId: 1, isStandard: true, sortOrder: 5 }]);

      await service.addUserExercise(USER_ID, { exerciseId: 1, isStandard: true, sortOrder: 5 });

      expect(drizzle.calls.some((call) => call.method === 'onConflictDoUpdate')).toBe(true);
    });

    it('rejects adding an exercise that is not visible', async () => {
      drizzle.queue([]);

      await expect(service.addUserExercise(USER_ID, { exerciseId: 42 })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes an entry', async () => {
      drizzle.queue([{ exerciseId: 1 }]);

      await expect(service.removeUserExercise(USER_ID, 1)).resolves.toBeUndefined();
      expect(drizzle.delete).toHaveBeenCalledTimes(1);
    });

    it('404s when removing an entry that is not on the list', async () => {
      drizzle.queue([]);

      await expect(service.removeUserExercise(USER_ID, 1)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the standard exercises for a new day', async () => {
      drizzle.queue([{ exercise: buildExercise({ id: 4, name: 'Dips', slug: 'dips' }) }]);

      await expect(service.listStandardExercises(USER_ID)).resolves.toEqual([
        expect.objectContaining({ id: 4, name: 'Dips' }),
      ]);
    });
  });
});
