import { UserRole, type UserProfile } from '@exercise-tracker/shared-types';
import type { UserRow } from '../database/schema/index.js';

/**
 * Maps a persisted user row onto the public `UserProfile` contract, stripping
 * every credential-related column.
 */
export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
    createdAt: row.createdAt.toISOString(),
  };
}
