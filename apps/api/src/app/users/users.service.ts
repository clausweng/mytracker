import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { UserProfile } from '@exercise-tracker/shared-types';
import { toUserProfile } from '../auth/user.mapper.js';
import { DRIZZLE_DB } from '../database/database.tokens.js';
import type { DrizzleDatabase } from '../database/drizzle.factory.js';
import { users } from '../database/schema/index.js';

/**
 * Read model for the authenticated user's own profile.
 */
@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDatabase) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) {
      throw new NotFoundException('User not found.');
    }

    return toUserProfile(row);
  }
}
