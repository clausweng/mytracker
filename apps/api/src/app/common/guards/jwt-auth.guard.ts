import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the `Authorization: Bearer <accessToken>` header via the
 * passport-jwt strategy and populates `request.user`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
