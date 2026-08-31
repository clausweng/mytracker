import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums.schema.js';

/**
 * A registered user. `username`/`passwordHash`/`hintQuestion`/`hintAnswerHash`
 * are nullable because OAuth-only accounts never set a local password.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique(),
  passwordHash: text('password_hash'),
  hintQuestion: text('hint_question'),
  hintAnswerHash: text('hint_answer_hash'),
  displayName: text('display_name').notNull(),
  role: userRoleEnum('role').notNull().default('USER'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
