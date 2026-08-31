import { UserRole } from '@exercise-tracker/shared-types';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { LogsController } from './logs.controller.js';
import type { LogsService } from './logs.service.js';

const USER: AuthenticatedUser = { userId: 'user-1', username: 'clausi', role: UserRole.USER };
const ENTRY = {
  clientLogId: '8a2e6a2c-2b1e-4a55-8f4a-2f4b6d9c0a11',
  exerciseId: 1,
  reps: 10,
  logDate: '2026-08-31',
  clientTimestamp: '2026-08-31T10:00:00.000Z',
};

describe('LogsController', () => {
  const service = {
    create: jest.fn().mockResolvedValue({ accumulatedReps: 10 }),
    sync: jest.fn().mockResolvedValue({ results: [] }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const controller = new LogsController(service as unknown as LogsService);

  afterEach(() => jest.clearAllMocks());

  it('creates a log', async () => {
    await controller.create(USER, ENTRY);
    expect(service.create).toHaveBeenCalledWith('user-1', ENTRY);
  });

  it('syncs a batch', async () => {
    await controller.sync(USER, { entries: [ENTRY] });
    expect(service.sync).toHaveBeenCalledWith('user-1', [ENTRY]);
  });

  it('removes a log', async () => {
    await controller.remove(USER, 'log-1');
    expect(service.remove).toHaveBeenCalledWith('user-1', 'log-1');
  });
});
