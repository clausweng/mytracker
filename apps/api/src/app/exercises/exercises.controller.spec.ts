import { ExerciseStatus, UserRole } from '@exercise-tracker/shared-types';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { ExercisesController } from './exercises.controller.js';
import { UserExercisesController } from './user-exercises.controller.js';
import type { ExercisesService } from './exercises.service.js';

const USER: AuthenticatedUser = { userId: 'user-1', username: 'clausi', role: UserRole.USER };

function createServiceMock() {
  return {
    search: jest.fn().mockResolvedValue([]),
    listMine: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 1 }),
    updateStatus: jest.fn().mockResolvedValue({ id: 1 }),
    listUserExercises: jest.fn().mockResolvedValue([]),
    addUserExercise: jest.fn().mockResolvedValue({ exerciseId: 1 }),
    removeUserExercise: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ExercisesController', () => {
  const service = createServiceMock();
  const controller = new ExercisesController(service as unknown as ExercisesService);

  afterEach(() => jest.clearAllMocks());

  it('delegates autocomplete to the service', async () => {
    await expect(controller.search(USER, { query: 'push' })).resolves.toEqual([]);
    expect(service.search).toHaveBeenCalledWith('user-1', 'push');
  });

  it('delegates the own-submissions listing', async () => {
    await controller.listMine(USER);
    expect(service.listMine).toHaveBeenCalledWith('user-1');
  });

  it('delegates submissions', async () => {
    const dto = { name: 'Kettlebell swings' };
    await controller.create(USER, dto);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates moderation', async () => {
    await controller.updateStatus(7, { status: ExerciseStatus.APPROVED });
    expect(service.updateStatus).toHaveBeenCalledWith(7, ExerciseStatus.APPROVED);
  });
});

describe('UserExercisesController', () => {
  const service = createServiceMock();
  const controller = new UserExercisesController(service as unknown as ExercisesService);

  afterEach(() => jest.clearAllMocks());

  it('lists the personal exercise list', async () => {
    await controller.list(USER);
    expect(service.listUserExercises).toHaveBeenCalledWith('user-1');
  });

  it('adds an exercise to the personal list', async () => {
    const dto = { exerciseId: 1 };
    await controller.add(USER, dto);
    expect(service.addUserExercise).toHaveBeenCalledWith('user-1', dto);
  });

  it('removes an exercise from the personal list', async () => {
    await controller.remove(USER, 1);
    expect(service.removeUserExercise).toHaveBeenCalledWith('user-1', 1);
  });
});
