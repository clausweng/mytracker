import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole, type Exercise } from '@exercise-tracker/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { ExercisesService } from './exercises.service.js';
import { CreateExerciseDto, ExerciseDto, ExerciseQueryDto, UpdateExerciseStatusDto } from './dto/index.js';

/**
 * Exercise catalogue: autocomplete, user submissions and moderation.
 */
@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Autocomplete approved exercises plus your own submissions.' })
  @ApiOkResponse({ description: 'Matching exercises.', type: [ExerciseDto] })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Missing or invalid access token.' })
  search(@CurrentUser() user: AuthenticatedUser, @Query() query: ExerciseQueryDto): Promise<Exercise[]> {
    return this.exercisesService.search(user.userId, query.query);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List the exercises you submitted, in any moderation state.' })
  @ApiOkResponse({ description: 'Your submitted exercises.', type: [ExerciseDto] })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<Exercise[]> {
    return this.exercisesService.listMine(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a new exercise; it is created as PENDING.' })
  @ApiCreatedResponse({ description: 'Exercise submitted.', type: ExerciseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'An exercise with that name already exists.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercisesService.create(user.userId, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Moderate an exercise (admin only).' })
  @ApiOkResponse({ description: 'Moderation status updated.', type: ExerciseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Admin role required.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exercise not found.' })
  updateStatus(
    @Param('id', ParseIntPipe) exerciseId: number,
    @Body() dto: UpdateExerciseStatusDto,
  ): Promise<Exercise> {
    return this.exercisesService.updateStatus(exerciseId, dto.status);
  }
}
