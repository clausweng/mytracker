import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { RegisterRequest } from '@exercise-tracker/shared-types';

export class RegisterDto implements RegisterRequest {
  @ApiProperty({ example: 'jane_doe', minLength: 3, maxLength: 64 })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 'super-secret-password', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Jane', minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;

  @ApiProperty({ example: 'What was the name of your first pet?' })
  @IsString()
  @MinLength(5)
  @MaxLength(256)
  hintQuestion!: string;

  @ApiProperty({ example: 'Rex' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  hintAnswer!: string;
}
