import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-facebook';
import { AuthProvider, type AuthResponse } from '@exercise-tracker/shared-types';
import { AuthService } from '../../auth/auth.service.js';
import { resolveDisplayName } from '../oauth.utils.js';

/**
 * Facebook OAuth2 strategy. Registered only when `FACEBOOK_CLIENT_ID` is
 * configured, so local development and CI boot without real credentials.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('FACEBOOK_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      profileFields: ['id', 'displayName'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<AuthResponse> {
    return this.authService.loginWithOAuthProfile({
      provider: AuthProvider.FACEBOOK,
      providerUserId: profile.id,
      displayName: resolveDisplayName(profile.displayName, profile.name?.givenName),
    });
  }
}
