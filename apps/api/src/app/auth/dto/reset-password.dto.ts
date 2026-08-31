import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { ResetPasswordRequest } from '@exercise-tracker/shared-types';

export class ResetPasswordDto implements ResetPasswordRequest {
  @ApiProperty({ example: 'jane_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  username!: string;

  @ApiProperty({ example: 'Rex' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  hintAnswer!: string;

  @ApiProperty({ example: 'a-brand-new-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
