import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ExerciseStatus, type Exercise } from '@exercise-tracker/shared-types';
import { ExercisesOfflineRepository } from './exercises-offline.repository';
import { deleteTrackerDb } from './tracker-db';

function buildExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 1,
    name: 'Push-up',
    slug: 'push-up',
    description: null,
    status: ExerciseStatus.APPROVED,
    createdByUserId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ExercisesOfflineRepository', () => {
  let repository: ExercisesOfflineRepository;

  beforeEach(async () => {
    await deleteTrackerDb();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(ExercisesOfflineRepository);
  });

  it('stores and retrieves exercises', async () => {
    await repository.putMany([buildExercise(), buildExercise({ id: 2, name: 'Pull-up', slug: 'pull-up' })]);

    const all = await repository.getAll();

    expect(all).toHaveLength(2);
    expect(all.map((exercise) => exercise.name).sort()).toEqual(['Pull-up', 'Push-up']);
  });

  it('searches case-insensitively by substring', async () => {
    await repository.putMany([buildExercise(), buildExercise({ id: 2, name: 'Pull-up', slug: 'pull-up' })]);

    const results = await repository.search('push');

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Push-up');
  });

  it('returns an empty array for a blank query', async () => {
    await repository.putMany([buildExercise()]);

    expect(await repository.search('   ')).toEqual([]);
  });

  it('gets a single exercise by id', async () => {
    await repository.put(buildExercise());

    expect(await repository.get(1)).toMatchObject({ name: 'Push-up' });
    expect(await repository.get(999)).toBeUndefined();
  });
});
