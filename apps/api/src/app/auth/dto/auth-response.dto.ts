import { ApiProperty } from '@nestjs/swagger';
import { UserRole, type AuthResponse, type HintQuestionResponse, type UserProfile } from '@exercise-tracker/shared-types';

export class UserProfileDto implements UserProfile {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true, example: 'jane_doe' })
  username!: string | null;

  @ApiProperty({ example: 'Jane' })
  displayName!: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ description: 'Short-lived JWT access token.' })
  accessToken!: string;

  @ApiProperty({ description: 'Rotating opaque refresh token.' })
  refreshToken!: string;

  @ApiProperty({ type: UserProfileDto })
  user!: UserProfileDto;
}

export class HintQuestionResponseDto implements HintQuestionResponse {
  @ApiProperty({ example: 'What was the name of your first pet?' })
  hintQuestion!: string;
}
