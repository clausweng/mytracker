import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';
import { AuthProvider, type AuthResponse } from '@exercise-tracker/shared-types';
import { AuthService } from '../../auth/auth.service.js';
import { resolveDisplayName } from '../oauth.utils.js';

/**
 * Google OAuth2 strategy. Registered only when `GOOGLE_CLIENT_ID` is
 * configured, so local development and CI boot without real credentials.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<AuthResponse> {
    return this.authService.loginWithOAuthProfile({
      provider: AuthProvider.GOOGLE,
      providerUserId: profile.id,
      displayName: resolveDisplayName(profile.displayName, profile.name?.givenName),
    });
  }
}
