import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { createHmac, randomBytes } from 'node:crypto';
import type { AuthTokenPair } from '@exercise-tracker/shared-types';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { refreshTokens, type UserRow } from '../database/schema/index.js';
import type { JwtPayload } from '../common/types/authenticated-user.js';
import { toUserProfile } from './user.mapper.js';

const DURATION_UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Converts a JWT-style TTL string (`15m`, `30d`, `3600`) into milliseconds.
 */
export function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) {
    throw new Error(`Unsupported TTL format: "${ttl}".`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  return amount * DURATION_UNITS[unit];
}

/**
 * Issues and rotates credentials: a short-lived signed access token plus an
 * opaque refresh token stored only as an HMAC-SHA256 digest, so a database
 * leak never yields usable refresh tokens.
 */
@Injectable()
export class TokenService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(user: UserRow): Promise<AuthTokenPair> {
    const profile = toUserProfile(user);
    const payload: JwtPayload = {
      sub: profile.id,
      username: profile.username,
      role: profile.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TTL'),
    });

    const refreshToken = randomBytes(48).toString('hex');
    const ttlMs = parseTtlToMs(this.configService.getOrThrow<string>('JWT_REFRESH_TTL'));

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Validates a refresh token and immediately revokes it (single use), so the
   * caller can mint a fresh pair. Returns the owning user id.
   */
  async consumeRefreshToken(refreshToken: string): Promise<string> {
    const tokenHash = this.hashToken(refreshToken);
    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .limit(1);

    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    await this.db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, row.id));

    return row.userId;
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.tokenHash, this.hashToken(refreshToken)), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  private hashToken(refreshToken: string): string {
    return createHmac('sha256', this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'))
      .update(refreshToken)
      .digest('hex');
  }
}
