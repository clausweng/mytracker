import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginRequest } from '@exercise-tracker/shared-types';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'jane_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 'super-secret-password' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
