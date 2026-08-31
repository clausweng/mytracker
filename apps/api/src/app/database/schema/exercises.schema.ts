import { sql } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { exerciseStatusEnum } from './enums.schema.js';
import { users } from './users.schema.js';

/**
 * The exercise catalogue. `id` is a numeric serial per the shared-types
 * contract (`exerciseId: number`) used throughout logging/sync payloads.
 * Name uniqueness is case-insensitive via a functional index on `lower(name)`.
 */
export const exercises = pgTable(
  'exercises',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    status: exerciseStatusEnum('status').notNull().default('PENDING'),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('exercises_name_lower_idx').on(sql`lower(${table.name})`)],
);

/**
 * A user's own exercise list: which catalogue exercises they track, whether
 * each is a "standard" exercise auto-added on new day creation, and display
 * order.
 */
export const userExercises = pgTable(
  'user_exercises',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    isStandard: boolean('is_standard').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('user_exercises_user_id_exercise_id_idx').on(table.userId, table.exerciseId)],
);

export type ExerciseRow = typeof exercises.$inferSelect;
export type NewExerciseRow = typeof exercises.$inferInsert;
export type UserExerciseRow = typeof userExercises.$inferSelect;
export type NewUserExerciseRow = typeof userExercises.$inferInsert;
