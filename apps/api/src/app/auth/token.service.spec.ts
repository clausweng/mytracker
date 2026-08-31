import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { parseTtlToMs, TokenService } from './token.service.js';
import type { UserRow } from '../database/schema/index.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

const ENV: Record<string, string> = {
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_REFRESH_TTL: '30d',
};

const USER: UserRow = {
  id: '22222222-2222-4222-8222-222222222222',
  username: 'jane_doe',
  passwordHash: 'hash',
  hintQuestion: 'First pet?',
  hintAnswerHash: 'hash',
  displayName: 'Jane',
  role: 'ADMIN',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('parseTtlToMs', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['2h', 7_200_000],
    ['30d', 2_592_000_000],
    ['3600', 3_600_000],
  ])('converts %s', (ttl, expected) => {
    expect(parseTtlToMs(ttl)).toBe(expected);
  });

  it('rejects an unsupported format', () => {
    expect(() => parseTtlToMs('soon')).toThrow('Unsupported TTL format');
  });
});

describe('TokenService', () => {
  let drizzle: DrizzleMock;
  let jwtService: { signAsync: jest.Mock };
  let configService: { getOrThrow: jest.Mock };
  let service: TokenService;

  beforeEach(() => {
    drizzle = createDrizzleMock();
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed-access-token') };
    configService = { getOrThrow: jest.fn((key: string) => ENV[key]) };
    service = new TokenService(
      drizzle.db,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('signs an access token carrying the role claim and persists the hashed refresh token', async () => {
    const pair = await service.issueTokenPair(USER);

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: USER.id, username: 'jane_doe', role: 'ADMIN' },
      { secret: 'access-secret', expiresIn: '15m' },
    );
    expect(pair.accessToken).toBe('signed-access-token');
    expect(pair.refreshToken).toHaveLength(96);
    expect(drizzle.insert).toHaveBeenCalledTimes(1);

    const values = drizzle.calls.find((call) => call.method === 'values')?.args[0] as {
      tokenHash: string;
      userId: string;
    };
    expect(values.userId).toBe(USER.id);
    expect(values.tokenHash).not.toContain(pair.refreshToken);
  });

  it('consumes a valid refresh token and revokes it', async () => {
    drizzle.queue([
      {
        id: 'token-row-id',
        userId: USER.id,
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      },
    ]);

    await expect(service.consumeRefreshToken('raw-token')).resolves.toBe(USER.id);
    expect(drizzle.update).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown refresh token', async () => {
    drizzle.queue([]);

    await expect(service.consumeRefreshToken('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(drizzle.update).not.toHaveBeenCalled();
  });

  it('rejects an expired refresh token', async () => {
    drizzle.queue([
      { id: 'token-row-id', userId: USER.id, expiresAt: new Date(Date.now() - 1), revokedAt: null },
    ]);

    await expect(service.consumeRefreshToken('raw-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes a single refresh token', async () => {
    await service.revokeRefreshToken('raw-token');

    expect(drizzle.update).toHaveBeenCalledTimes(1);
  });

  it('revokes every active refresh token of a user', async () => {
    await service.revokeAllForUser(USER.id);

    expect(drizzle.update).toHaveBeenCalledTimes(1);
  });
});
