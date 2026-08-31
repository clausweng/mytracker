import type { UserProfile } from './user.contracts.js';

/**
 * Anonymous registration request: username/password plus a security question
 * used to reset the password without an email address on file.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  displayName: string;
  hintQuestion: string;
  hintAnswer: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokenPair {
  user: UserProfile;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface HintQuestionResponse {
  hintQuestion: string;
}

export interface ResetPasswordRequest {
  username: string;
  hintAnswer: string;
  newPassword: string;
}
