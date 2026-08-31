import { relations } from 'drizzle-orm';
import { authProviders } from './auth-providers.schema.js';
import { daySessions } from './day-sessions.schema.js';
import { exercises, userExercises } from './exercises.schema.js';
import { refreshTokens } from './refresh-tokens.schema.js';
import { repLogs } from './rep-logs.schema.js';
import { users } from './users.schema.js';

export const usersRelations = relations(users, ({ many }) => ({
  authProviders: many(authProviders),
  refreshTokens: many(refreshTokens),
  daySessions: many(daySessions),
  repLogs: many(repLogs),
  userExercises: many(userExercises),
  createdExercises: many(exercises),
}));

export const authProvidersRelations = relations(authProviders, ({ one }) => ({
  user: one(users, { fields: [authProviders.userId], references: [users.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  createdBy: one(users, { fields: [exercises.createdByUserId], references: [users.id] }),
  userExercises: many(userExercises),
  repLogs: many(repLogs),
}));

export const userExercisesRelations = relations(userExercises, ({ one }) => ({
  user: one(users, { fields: [userExercises.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [userExercises.exerciseId], references: [exercises.id] }),
}));

export const daySessionsRelations = relations(daySessions, ({ one, many }) => ({
  user: one(users, { fields: [daySessions.userId], references: [users.id] }),
  repLogs: many(repLogs),
}));

export const repLogsRelations = relations(repLogs, ({ one }) => ({
  user: one(users, { fields: [repLogs.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [repLogs.exerciseId], references: [exercises.id] }),
  daySession: one(daySessions, { fields: [repLogs.daySessionId], references: [daySessions.id] }),
}));
