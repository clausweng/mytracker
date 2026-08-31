import type { UserRole } from '@exercise-tracker/shared-types';

/**
 * Shape attached to `request.user` by the JWT strategy and exposed through
 * the `@CurrentUser()` parameter decorator.
 */
export interface AuthenticatedUser {
  userId: string;
  username: string | null;
  role: UserRole;
}

/**
 * Signed access-token payload.
 */
export interface JwtPayload {
  sub: string;
  username: string | null;
  role: UserRole;
}
