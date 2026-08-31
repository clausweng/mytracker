import { UserRole } from '@exercise-tracker/shared-types';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { DaysController } from './days.controller.js';
import type { DaysService } from './days.service.js';

const USER: AuthenticatedUser = { userId: 'user-1', username: 'clausi', role: UserRole.USER };

describe('DaysController', () => {
  const service = {
    createDay: jest.fn().mockResolvedValue({ logDate: '2026-08-31' }),
    listRange: jest.fn().mockResolvedValue([]),
    getDay: jest.fn().mockResolvedValue({ logDate: '2026-08-31' }),
  };
  const controller = new DaysController(service as unknown as DaysService);

  afterEach(() => jest.clearAllMocks());

  it('creates a day session', async () => {
    await controller.createDay(USER, { logDate: '2026-08-31' });
    expect(service.createDay).toHaveBeenCalledWith('user-1', '2026-08-31');
  });

  it('lists a date range', async () => {
    await controller.listRange(USER, { from: '2026-08-01', to: '2026-08-31' });
    expect(service.listRange).toHaveBeenCalledWith('user-1', '2026-08-01', '2026-08-31');
  });

  it('fetches a single day', async () => {
    await controller.getDay(USER, '2026-08-31');
    expect(service.getDay).toHaveBeenCalledWith('user-1', '2026-08-31');
  });
});
