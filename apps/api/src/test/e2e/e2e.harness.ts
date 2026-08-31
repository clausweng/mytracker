import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { inArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../app/app.module.js';
import { configureApp } from '../../app/bootstrap.js';
import { DRIZZLE_DB } from '../../app/database/database.tokens.js';
import type { DrizzleDatabase } from '../../app/database/drizzle.factory.js';
import { users } from '../../app/database/schema/index.js';

/** Prefix used by every e2e fixture user so cleanup is trivial. */
export const E2E_USERNAME_PREFIX = 'e2e_';

export interface E2eContext {
  app: INestApplication;
  db: DrizzleDatabase;
  /** Fixture users created by this suite; removed during cleanup. */
  usernames: string[];
}

/**
 * Boots the real application (real Postgres, real migrations) with the same
 * middleware pipeline as production.
 */
export async function createE2eApp(): Promise<E2eContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();

  return { app, db: app.get<DrizzleDatabase>(DRIZZLE_DB), usernames: [] };
}

/**
 * Removes the fixture users created by this suite only (suites run in
 * parallel); `ON DELETE CASCADE` clears their sessions and logs.
 */
export async function cleanupE2eApp(context: E2eContext): Promise<void> {
  if (context.usernames.length > 0) {
    await context.db.delete(users).where(inArray(users.username, context.usernames));
  }
  await context.app.close();
}

export function uniqueUsername(context: E2eContext): string {
  const username = `${E2E_USERNAME_PREFIX}${randomUUID().slice(0, 8)}`;
  context.usernames.push(username);
  return username;
}

export const API = '/api/v1';
