import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@exercise-tracker/shared-types';
import { UsersService } from './users.service.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const USER_ID = '44444444-4444-4444-8444-444444444444';

describe('UsersService', () => {
  let drizzle: DrizzleMock;
  let service: UsersService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    service = new UsersService(drizzle.db);
  });

  it('returns the public profile without credential columns', async () => {
    drizzle.queue([
      {
        id: USER_ID,
        username: 'jane_doe',
        passwordHash: 'secret',
        hintQuestion: 'First pet?',
        hintAnswerHash: 'secret',
        displayName: 'Jane',
        role: 'ADMIN',
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);

    await expect(service.getProfile(USER_ID)).resolves.toEqual({
      id: USER_ID,
      username: 'jane_doe',
      displayName: 'Jane',
      role: UserRole.ADMIN,
      createdAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('404s for an unknown user', async () => {
    drizzle.queue([]);

    await expect(service.getProfile(USER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});
