import { ConflictException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import {
  AuthProvider,
  type AuthResponse,
  type HintQuestionResponse,
  type LoginRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
} from '@exercise-tracker/shared-types';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { authProviders, users, type UserRow } from '../database/schema/index.js';
import { TokenService } from './token.service.js';
import { toUserProfile } from './user.mapper.js';

export interface OAuthProfileInput {
  provider: AuthProvider;
  providerUserId: string;
  displayName: string;
}

/**
 * Owns credential handling: local registration/login, hint-question based
 * password reset, refresh-token rotation and OAuth account linking.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase,
    private readonly tokenService: TokenService,
  ) {}

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const existing = await this.findByUsername(request.username);
    if (existing) {
      throw new ConflictException('Username is already taken.');
    }

    const [created] = await this.db
      .insert(users)
      .values({
        username: request.username,
        passwordHash: await argon2.hash(request.password),
        hintQuestion: request.hintQuestion,
        hintAnswerHash: await argon2.hash(this.normaliseHintAnswer(request.hintAnswer)),
        displayName: request.displayName,
      })
      .returning();

    return this.buildAuthResponse(created);
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const user = await this.findByUsername(request.username);
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, request.password))) {
      throw new UnauthorizedException('Invalid username or password.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const userId = await this.tokenService.consumeRefreshToken(refreshToken);
    const user = await this.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async getHintQuestion(username: string): Promise<HintQuestionResponse> {
    const user = await this.findByUsername(username);
    if (!user?.hintQuestion) {
      throw new NotFoundException('No hint question is available for this user.');
    }

    return { hintQuestion: user.hintQuestion };
  }

  async resetPassword(request: ResetPasswordRequest): Promise<AuthResponse> {
    const user = await this.findByUsername(request.username);
    if (
      !user?.hintAnswerHash ||
      !(await argon2.verify(user.hintAnswerHash, this.normaliseHintAnswer(request.hintAnswer)))
    ) {
      throw new UnauthorizedException('The hint answer is incorrect.');
    }

    const [updated] = await this.db
      .update(users)
      .set({ passwordHash: await argon2.hash(request.newPassword) })
      .where(eq(users.id, user.id))
      .returning();

    await this.tokenService.revokeAllForUser(user.id);

    return this.buildAuthResponse(updated);
  }

  /**
   * Resolves an OAuth identity to a local account, creating and linking one on
   * first sign-in.
   */
  async loginWithOAuthProfile(profile: OAuthProfileInput): Promise<AuthResponse> {
    const [link] = await this.db
      .select()
      .from(authProviders)
      .where(eq(authProviders.providerUserId, profile.providerUserId))
      .limit(1);

    if (link && link.provider === profile.provider) {
      const linkedUser = await this.findById(link.userId);
      if (linkedUser) {
        return this.buildAuthResponse(linkedUser);
      }
    }

    const [created] = await this.db.insert(users).values({ displayName: profile.displayName }).returning();

    await this.db.insert(authProviders).values({
      userId: created.id,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    });

    return this.buildAuthResponse(created);
  }

  private async buildAuthResponse(user: UserRow): Promise<AuthResponse> {
    const tokens = await this.tokenService.issueTokenPair(user);
    return { ...tokens, user: toUserProfile(user) };
  }

  private async findByUsername(username: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return row;
  }

  private async findById(userId: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    return row;
  }

  private normaliseHintAnswer(hintAnswer: string): string {
    return hintAnswer.trim().toLowerCase();
  }
}
