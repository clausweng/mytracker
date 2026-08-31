import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Mirrors `ExerciseStatus` from `@exercise-tracker/shared-types`.
 */
export const exerciseStatusEnum = pgEnum('exercise_status', ['PENDING', 'APPROVED', 'REJECTED']);

/**
 * Mirrors `AuthProvider` from `@exercise-tracker/shared-types`.
 */
export const authProviderEnum = pgEnum('auth_provider', ['GOOGLE', 'FACEBOOK']);

/**
 * Mirrors `UserRole` from `@exercise-tracker/shared-types`.
 */
export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN']);
