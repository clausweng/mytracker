import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import type { CreateDayRequest, DayExerciseSummary, DayRangeQuery, DaySession } from '@exercise-tracker/shared-types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateDayDto implements CreateDayRequest {
  @ApiProperty({ example: '2026-08-31', description: 'Client-supplied day in YYYY-MM-DD form.' })
  @Matches(ISO_DATE_PATTERN, { message: 'must be formatted as YYYY-MM-DD' })
  logDate!: string;
}

export class DayRangeQueryDto implements DayRangeQuery {
  @ApiProperty({ example: '2026-08-01' })
  @Matches(ISO_DATE_PATTERN, { message: 'must be formatted as YYYY-MM-DD' })
  from!: string;

  @ApiProperty({ example: '2026-08-31' })
  @Matches(ISO_DATE_PATTERN, { message: 'must be formatted as YYYY-MM-DD' })
  to!: string;
}

export class DayExerciseSummaryDto implements DayExerciseSummary {
  @ApiProperty({ example: 1 })
  exerciseId!: number;

  @ApiProperty({ example: 'Push-ups' })
  exerciseName!: string;

  @ApiProperty({ example: 60 })
  accumulatedReps!: number;
}

export class DaySessionDto implements DaySession {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-08-31' })
  logDate!: string;

  @ApiProperty({ type: [DayExerciseSummaryDto] })
  exercises!: DayExerciseSummaryDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
