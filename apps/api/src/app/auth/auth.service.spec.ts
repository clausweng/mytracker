import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider, UserRole } from '@exercise-tracker/shared-types';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import type { TokenService } from './token.service.js';
import type { UserRow } from '../database/schema/index.js';
import { createDrizzleMock, type DrizzleMock } from '../../test/drizzle-mock.js';

jest.mock('argon2', () => ({
  hash: jest.fn(() => Promise.resolve('hashed')),
  verify: jest.fn(() => Promise.resolve(true)),
}));

const hashMock = argon2.hash as unknown as jest.Mock;
const verifyMock = argon2.verify as unknown as jest.Mock;

function buildUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'jane_doe',
    passwordHash: 'stored-password-hash',
    hintQuestion: 'First pet?',
    hintAnswerHash: 'stored-hint-hash',
    displayName: 'Jane',
    role: 'USER',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AuthService', () => {
  let drizzle: DrizzleMock;
  let tokenService: jest.Mocked<Pick<TokenService, 'issueTokenPair' | 'consumeRefreshToken' | 'revokeRefreshToken' | 'revokeAllForUser'>>;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    hashMock.mockResolvedValue('hashed');
    verifyMock.mockResolvedValue(true);
    drizzle = createDrizzleMock();
    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
      consumeRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    service = new AuthService(drizzle.db, tokenService as unknown as TokenService);
  });

  describe('register', () => {
    it('creates the account, hashes both secrets and issues a token pair', async () => {
      const created = buildUser();
      drizzle.queue([], [created]);

      const response = await service.register({
        username: 'jane_doe',
        password: 'super-secret',
        displayName: 'Jane',
        hintQuestion: 'First pet?',
        hintAnswer: ' Rex ',
      });

      expect(hashMock).toHaveBeenCalledWith('super-secret');
      expect(hashMock).toHaveBeenCalledWith('rex');
      expect(response).toEqual({
        accessToken: 'access',
        refreshToken: 'refresh',
        user: {
          id: created.id,
          username: 'jane_doe',
          displayName: 'Jane',
          role: UserRole.USER,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
    });

    it('rejects a duplicate username', async () => {
      drizzle.queue([buildUser()]);

      await expect(
        service.register({
          username: 'jane_doe',
          password: 'super-secret',
          displayName: 'Jane',
          hintQuestion: 'First pet?',
          hintAnswer: 'Rex',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(drizzle.insert).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      drizzle.queue([buildUser()]);

      const response = await service.login({ username: 'jane_doe', password: 'super-secret' });

      expect(verifyMock).toHaveBeenCalledWith('stored-password-hash', 'super-secret');
      expect(response.accessToken).toBe('access');
    });

    it('rejects a wrong password', async () => {
      drizzle.queue([buildUser()]);
      verifyMock.mockResolvedValue(false);

      await expect(service.login({ username: 'jane_doe', password: 'nope' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an unknown username', async () => {
      drizzle.queue([]);

      await expect(service.login({ username: 'ghost', password: 'nope' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects an OAuth-only account without a local password', async () => {
      drizzle.queue([buildUser({ passwordHash: null })]);

      await expect(service.login({ username: 'jane_doe', password: 'nope' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rotates the refresh token and issues a new pair', async () => {
      const user = buildUser();
      tokenService.consumeRefreshToken.mockResolvedValue(user.id);
      drizzle.queue([user]);

      const response = await service.refresh('old-refresh-token');

      expect(tokenService.consumeRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(tokenService.issueTokenPair).toHaveBeenCalledWith(user);
      expect(response.refreshToken).toBe('refresh');
    });

    it('rejects when the owning user no longer exists', async () => {
      tokenService.consumeRefreshToken.mockResolvedValue('missing-user');
      drizzle.queue([]);

      await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  it('logout revokes the presented refresh token', async () => {
    await service.logout('refresh-token');

    expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
  });

  describe('hint question', () => {
    it('returns the stored question', async () => {
      drizzle.queue([buildUser()]);

      await expect(service.getHintQuestion('jane_doe')).resolves.toEqual({ hintQuestion: 'First pet?' });
    });

    it('404s for an unknown user', async () => {
      drizzle.queue([]);

      await expect(service.getHintQuestion('ghost')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s when the account has no hint question', async () => {
      drizzle.queue([buildUser({ hintQuestion: null })]);

      await expect(service.getHintQuestion('jane_doe')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('replaces the password and revokes every refresh token', async () => {
      const user = buildUser();
      drizzle.queue([user], [user]);

      const response = await service.resetPassword({
        username: 'jane_doe',
        hintAnswer: 'REX',
        newPassword: 'a-brand-new-password',
      });

      expect(verifyMock).toHaveBeenCalledWith('stored-hint-hash', 'rex');
      expect(hashMock).toHaveBeenCalledWith('a-brand-new-password');
      expect(tokenService.revokeAllForUser).toHaveBeenCalledWith(user.id);
      expect(response.user.id).toBe(user.id);
    });

    it('rejects a wrong hint answer', async () => {
      drizzle.queue([buildUser()]);
      verifyMock.mockResolvedValue(false);

      await expect(
        service.resetPassword({ username: 'jane_doe', hintAnswer: 'wrong', newPassword: 'a-brand-new-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects when the account has no hint answer on file', async () => {
      drizzle.queue([buildUser({ hintAnswerHash: null })]);

      await expect(
        service.resetPassword({ username: 'jane_doe', hintAnswer: 'rex', newPassword: 'a-brand-new-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('loginWithOAuthProfile', () => {
    it('reuses the linked account', async () => {
      const user = buildUser({ username: null });
      drizzle.queue([{ userId: user.id, provider: 'GOOGLE', providerUserId: 'google-123' }], [user]);

      const response = await service.loginWithOAuthProfile({
        provider: AuthProvider.GOOGLE,
        providerUserId: 'google-123',
        displayName: 'Jane',
      });

      expect(response.user.id).toBe(user.id);
      expect(drizzle.insert).not.toHaveBeenCalled();
    });

    it('creates and links a new account on first sign-in', async () => {
      const created = buildUser({ username: null });
      drizzle.queue([], [created], []);

      const response = await service.loginWithOAuthProfile({
        provider: AuthProvider.FACEBOOK,
        providerUserId: 'facebook-9',
        displayName: 'Jane',
      });

      expect(drizzle.insert).toHaveBeenCalledTimes(2);
      expect(response.user.username).toBeNull();
    });
  });
});
