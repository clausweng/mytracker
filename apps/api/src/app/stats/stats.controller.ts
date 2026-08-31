import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { StatsSummaryResponse, StatsTimeseriesResponse } from '@exercise-tracker/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../common/types/authenticated-user.js';
import { StatsService } from './stats.service.js';
import { StatsQueryDto, StatsSummaryResponseDto, StatsTimeseriesResponseDto } from './dto/index.js';

/**
 * Period statistics over the caller's rep logs.
 */
@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Total reps per exercise for the resolved period.' })
  @ApiOkResponse({ description: 'Totals per exercise.', type: StatsSummaryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Missing "since" for period=SINCE.' })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: StatsQueryDto): Promise<StatsSummaryResponse> {
    return this.statsService.summary(user.userId, query);
  }

  @Get('timeseries')
  @ApiOperation({ summary: 'Reps bucketed over time (day/week/month depending on the period).' })
  @ApiOkResponse({ description: 'Bucketed totals.', type: StatsTimeseriesResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Missing "since" for period=SINCE.' })
  timeseries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: StatsQueryDto,
  ): Promise<StatsTimeseriesResponse> {
    return this.statsService.timeseries(user.userId, query);
  }
}
