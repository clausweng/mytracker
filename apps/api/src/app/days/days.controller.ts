import { Body, Controller, Get, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { DaySession } from '@exercise-tracker/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { DaysService } from './days.service.js';
import { CreateDayDto, DayRangeQueryDto, DaySessionDto } from './dto/index.js';

/**
 * Day sessions and their accumulated reps.
 */
@ApiTags('days')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('days')
export class DaysController {
  constructor(private readonly daysService: DaysService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new day (idempotent per user and date).' })
  @ApiCreatedResponse({ description: 'The day session, existing or newly created.', type: DaySessionDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid or too-far-future log date.' })
  createDay(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDayDto): Promise<DaySession> {
    return this.daysService.createDay(user.userId, dto.logDate);
  }

  @Get()
  @ApiOperation({ summary: 'List day sessions within an inclusive date range.' })
  @ApiOkResponse({ description: 'Day sessions in range.', type: [DaySessionDto] })
  listRange(@CurrentUser() user: AuthenticatedUser, @Query() query: DayRangeQueryDto): Promise<DaySession[]> {
    return this.daysService.listRange(user.userId, query.from, query.to);
  }

  @Get(':date')
  @ApiOperation({ summary: "Fetch a day's exercises with their accumulated reps." })
  @ApiOkResponse({ description: 'The day session.', type: DaySessionDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No day session exists for that date.' })
  getDay(@CurrentUser() user: AuthenticatedUser, @Param('date') date: string): Promise<DaySession> {
    return this.daysService.getDay(user.userId, date);
  }
}
