import type { ConfigService } from '@nestjs/config';
import { UserRole } from '@exercise-tracker/shared-types';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  const configService = { getOrThrow: () => 'access-secret' } as unknown as ConfigService;
  const strategy = new JwtStrategy(configService);

  it('maps an admin payload', () => {
    expect(strategy.validate({ sub: 'user-id', username: 'jane', role: UserRole.ADMIN })).toEqual({
      userId: 'user-id',
      username: 'jane',
      role: UserRole.ADMIN,
    });
  });

  it('defaults unknown roles and missing usernames', () => {
    expect(strategy.validate({ sub: 'user-id', username: null, role: 'ROOT' as UserRole })).toEqual({
      userId: 'user-id',
      username: null,
      role: UserRole.USER,
    });
  });
});
