import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { UserExercise } from '@exercise-tracker/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { ExercisesService } from './exercises.service.js';
import { AddUserExerciseDto, UserExerciseDto } from './dto/index.js';

/**
 * The authenticated user's own exercise list.
 */
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/exercises')
export class UserExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'List the exercises on your personal list.' })
  @ApiOkResponse({ description: 'Your exercise list.', type: [UserExerciseDto] })
  list(@CurrentUser() user: AuthenticatedUser): Promise<UserExercise[]> {
    return this.exercisesService.listUserExercises(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add an exercise to your personal list.' })
  @ApiCreatedResponse({ description: 'Exercise added.', type: UserExerciseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exercise not found or not visible to you.' })
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddUserExerciseDto): Promise<UserExercise> {
    return this.exercisesService.addUserExercise(user.userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an exercise from your personal list.' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Exercise removed.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Exercise is not on your list.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) exerciseId: number): Promise<void> {
    return this.exercisesService.removeUserExercise(user.userId, exerciseId);
  }
}
