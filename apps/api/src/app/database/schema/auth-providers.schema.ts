import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { authProviderEnum } from './enums.schema.js';
import { users } from './users.schema.js';

/**
 * Links a user to an OAuth2 identity (Google/Facebook). A user may have at
 * most one linked identity per provider, enforced via the composite unique
 * index on (provider, provider_user_id).
 */
export const authProviders = pgTable(
  'auth_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('auth_providers_provider_provider_user_id_idx').on(table.provider, table.providerUserId)],
);

export type AuthProviderRow = typeof authProviders.$inferSelect;
export type NewAuthProviderRow = typeof authProviders.$inferInsert;
