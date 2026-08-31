import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { UserRole } from '@exercise-tracker/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Declares the roles allowed to call a route. Enforced by `RolesGuard`.
 */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
