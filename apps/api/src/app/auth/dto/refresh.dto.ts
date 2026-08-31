import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import type { LogoutRequest, RefreshRequest } from '@exercise-tracker/shared-types';

export class RefreshDto implements RefreshRequest {
  @ApiProperty({ description: 'The opaque refresh token issued by login/refresh.' })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}

export class LogoutDto implements LogoutRequest {
  @ApiProperty({ description: 'The refresh token to revoke.' })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
