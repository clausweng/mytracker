import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import {
  ExerciseStatus,
  type AddUserExerciseRequest,
  type CreateExerciseRequest,
  type Exercise,
  type ExerciseAutocompleteQuery,
  type UpdateExerciseStatusRequest,
  type UserExercise,
} from '@exercise-tracker/shared-types';

export class CreateExerciseDto implements CreateExerciseRequest {
  @ApiProperty({ example: 'Kettlebell swings', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Two-handed Russian kettlebell swing.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ExerciseQueryDto implements ExerciseAutocompleteQuery {
  @ApiProperty({ example: 'push', description: 'Case-insensitive substring match on the exercise name.' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  query!: string;
}

export class AddUserExerciseDto implements AddUserExerciseRequest {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  exerciseId!: number;

  @ApiPropertyOptional({ default: false, description: 'Auto-added when the user starts a new day.' })
  @IsOptional()
  @IsBoolean()
  isStandard?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateExerciseStatusDto implements UpdateExerciseStatusRequest {
  @ApiProperty({ enum: ExerciseStatus, enumName: 'ExerciseStatus' })
  @IsEnum(ExerciseStatus)
  status!: ExerciseStatus;
}

export class ExerciseDto implements Exercise {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Push-ups' })
  name!: string;

  @ApiProperty({ example: 'push-ups' })
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ExerciseStatus, enumName: 'ExerciseStatus' })
  status!: ExerciseStatus;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class UserExerciseDto implements UserExercise {
  @ApiProperty({ example: 1 })
  exerciseId!: number;

  @ApiProperty({ example: true })
  isStandard!: boolean;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}
