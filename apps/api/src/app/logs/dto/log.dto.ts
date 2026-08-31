import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsUUID, Matches, Min, ValidateNested } from 'class-validator';
import {
  SyncEntryStatus,
  type CreateLogResponse,
  type LogEntryContract,
  type SyncEntryResult,
  type SyncLogsRequest,
  type SyncLogsResponse,
} from '@exercise-tracker/shared-types';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Upper bound on a single offline sync batch. */
export const MAX_SYNC_BATCH_SIZE = 500;

export class LogEntryDto implements LogEntryContract {
  @ApiProperty({ format: 'uuid', description: 'Client-generated UUID v4 making the entry idempotent.' })
  @IsUUID('4')
  clientLogId!: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  exerciseId!: number;

  @ApiProperty({ example: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reps!: number;

  @ApiProperty({ example: '2026-08-31' })
  @Matches(ISO_DATE_PATTERN, { message: 'must be formatted as YYYY-MM-DD' })
  logDate!: string;

  @ApiProperty({ example: 1_788_000_000_000, description: 'Epoch milliseconds; used for last-write-wins.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clientTimestamp!: number;
}

export class SyncLogsDto implements SyncLogsRequest {
  @ApiProperty({ type: [LogEntryDto], maxItems: MAX_SYNC_BATCH_SIZE })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SYNC_BATCH_SIZE)
  @ValidateNested({ each: true })
  @Type(() => LogEntryDto)
  entries!: LogEntryDto[];
}

export class CreateLogResponseDto implements CreateLogResponse {
  @ApiProperty({ example: '2026-08-31' })
  logDate!: string;

  @ApiProperty({ example: 1 })
  exerciseId!: number;

  @ApiProperty({ example: 60, description: "The day's total reps for this exercise after the write." })
  accumulatedReps!: number;
}

export class SyncEntryResultDto implements SyncEntryResult {
  @ApiProperty({ format: 'uuid' })
  clientLogId!: string;

  @ApiProperty({ enum: SyncEntryStatus, enumName: 'SyncEntryStatus' })
  status!: SyncEntryStatus;
}

export class SyncLogsResponseDto implements SyncLogsResponse {
  @ApiProperty({ type: [SyncEntryResultDto] })
  results!: SyncEntryResultDto[];
}
