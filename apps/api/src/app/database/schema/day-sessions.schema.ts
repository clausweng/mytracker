import { date, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.schema.js';

/**
 * A "new day" the user has opened. Unique per (user, logDate); creating one
 * snapshots the user's standard exercises for that day.
 */
export const daySessions = pgTable(
  'day_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    logDate: date('log_date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('day_sessions_user_id_log_date_idx').on(table.userId, table.logDate)],
);

export type DaySessionRow = typeof daySessions.$inferSelect;
export type NewDaySessionRow = typeof daySessions.$inferInsert;
