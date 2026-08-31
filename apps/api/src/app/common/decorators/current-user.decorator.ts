import { createParamDecorator, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../types/authenticated-user.js';

interface RequestWithUser {
  user?: AuthenticatedUser;
}

/**
 * Extracts the authenticated user injected by `JwtAuthGuard`. Routes using it
 * must be guarded, otherwise the request is rejected as unauthenticated.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<RequestWithUser>();
  if (!request.user) {
    throw new UnauthorizedException('Authenticated user is missing from the request.');
  }
  return request.user;
});
