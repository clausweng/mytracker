import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UserProfile } from '@exercise-tracker/shared-types';
import { UserProfileDto } from '../auth/dto/index.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Fetch the authenticated user's profile." })
  @ApiOkResponse({ description: 'The current user.', type: UserProfileDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid access token.' })
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.usersService.getProfile(user.userId);
  }
}
