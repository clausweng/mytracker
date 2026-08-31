import type { UserRole } from './enums.js';

/**
 * Public-facing representation of the authenticated user.
 */
export interface UserProfile {
  id: string;
  username: string | null;
  displayName: string;
  role: UserRole;
  createdAt: string;
}
