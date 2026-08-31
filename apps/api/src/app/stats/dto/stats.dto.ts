import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import {
  StatsPeriod,
  type StatsSummaryEntry,
  type StatsSummaryQuery,
  type StatsSummaryResponse,
  type StatsTimeseriesPoint,
  type StatsTimeseriesQuery,
  type StatsTimeseriesResponse,
} from '@exercise-tracker/shared-types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Shared query DTO: summary and timeseries take identical parameters.
 */
export class StatsQueryDto implements StatsSummaryQuery, StatsTimeseriesQuery {
  @ApiProperty({ enum: StatsPeriod, enumName: 'StatsPeriod' })
  @IsEnum(StatsPeriod)
  period!: StatsPeriod;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Start date; required when period=SINCE.' })
  @IsOptional()
  @Matches(ISO_DATE_PATTERN, { message: 'must be formatted as YYYY-MM-DD' })
  since?: string;

  @ApiPropertyOptional({ example: 1, description: 'Restrict the aggregation to a single exercise.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  exerciseId?: number;
}

export class StatsSummaryEntryDto implements StatsSummaryEntry {
  @ApiProperty({ example: 1 })
  exerciseId!: number;

  @ApiProperty({ example: 'Push-ups' })
  exerciseName!: string;

  @ApiProperty({ example: 420 })
  totalReps!: number;
}

export class StatsSummaryResponseDto implements StatsSummaryResponse {
  @ApiProperty({ enum: StatsPeriod, enumName: 'StatsPeriod' })
  period!: StatsPeriod;

  @ApiProperty({ example: '2026-08-25' })
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  to!: string;

  @ApiProperty({ type: [StatsSummaryEntryDto] })
  entries!: StatsSummaryEntryDto[];
}

export class StatsTimeseriesPointDto implements StatsTimeseriesPoint {
  @ApiProperty({ example: '2026-08-31', description: 'Start date of the bucket.' })
  bucket!: string;

  @ApiProperty({ example: 120 })
  totalReps!: number;
}

export class StatsTimeseriesResponseDto implements StatsTimeseriesResponse {
  @ApiProperty({ enum: StatsPeriod, enumName: 'StatsPeriod' })
  period!: StatsPeriod;

  @ApiProperty({ type: [StatsTimeseriesPointDto] })
  points!: StatsTimeseriesPointDto[];
}
