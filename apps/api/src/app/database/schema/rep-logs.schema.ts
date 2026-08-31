import { bigint, date, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { daySessions } from './day-sessions.schema.js';
import { exercises } from './exercises.schema.js';
import { users } from './users.schema.js';

/**
 * A single rep-logging entry. Unique per (user, clientLogId) so retried
 * offline syncs upsert instead of double-counting reps.
 */
export const repLogs = pgTable(
  'rep_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    daySessionId: uuid('day_session_id')
      .notNull()
      .references(() => daySessions.id, { onDelete: 'cascade' }),
    clientLogId: uuid('client_log_id').notNull(),
    reps: integer('reps').notNull(),
    logDate: date('log_date', { mode: 'string' }).notNull(),
    clientTimestamp: bigint('client_timestamp', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('rep_logs_user_id_client_log_id_idx').on(table.userId, table.clientLogId)],
);

export type RepLogRow = typeof repLogs.$inferSelect;
export type NewRepLogRow = typeof repLogs.$inferInsert;
