import type { ConfigService } from '@nestjs/config';
import type { Profile as FacebookProfile } from 'passport-facebook';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import { AuthProvider } from '@exercise-tracker/shared-types';
import type { AuthService } from '../auth/auth.service.js';
import { OauthModule } from './oauth.module.js';
import { FacebookOauthController, GoogleOauthController } from './oauth.controller.js';
import { FALLBACK_DISPLAY_NAME, resolveDisplayName } from './oauth.utils.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { FacebookStrategy } from './strategies/facebook.strategy.js';

const ENV: Record<string, string> = {
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
  FACEBOOK_CLIENT_ID: 'facebook-client-id',
  FACEBOOK_CLIENT_SECRET: 'facebook-client-secret',
  FACEBOOK_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/facebook/callback',
};

const configService = { getOrThrow: (key: string) => ENV[key] } as unknown as ConfigService;

const AUTH_RESPONSE = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: { id: 'user-id', username: null, displayName: 'Jane', role: 'USER', createdAt: 'now' },
};

describe('resolveDisplayName', () => {
  it('prefers the display name', () => {
    expect(resolveDisplayName('Jane Doe', 'Jane')).toBe('Jane Doe');
  });

  it('falls back to the given name', () => {
    expect(resolveDisplayName('  ', 'Jane')).toBe('Jane');
  });

  it('falls back to a generic name', () => {
    expect(resolveDisplayName(undefined, undefined)).toBe(FALLBACK_DISPLAY_NAME);
  });
});

describe('OauthModule.forRoot', () => {
  it('registers nothing when no provider is configured', () => {
    const module = OauthModule.forRoot({});

    expect(module.providers).toEqual([]);
    expect(module.controllers).toEqual([]);
  });

  it('registers only the configured providers', () => {
    const module = OauthModule.forRoot({ GOOGLE_CLIENT_ID: 'id' });

    expect(module.providers).toEqual([GoogleStrategy]);
    expect(module.controllers).toEqual([GoogleOauthController]);
  });

  it('registers both providers when both are configured', () => {
    const module = OauthModule.forRoot({ GOOGLE_CLIENT_ID: 'id', FACEBOOK_CLIENT_ID: 'id' });

    expect(module.providers).toEqual([GoogleStrategy, FacebookStrategy]);
    expect(module.controllers).toEqual([GoogleOauthController, FacebookOauthController]);
  });
});

describe('OAuth strategies', () => {
  const authService = {
    loginWithOAuthProfile: jest.fn().mockResolvedValue(AUTH_RESPONSE),
  } as unknown as AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GoogleStrategy.validate links the Google identity', async () => {
    const strategy = new GoogleStrategy(configService, authService);
    const profile = { id: 'google-123', displayName: 'Jane Doe' } as GoogleProfile;

    await expect(strategy.validate('at', 'rt', profile)).resolves.toEqual(AUTH_RESPONSE);
    expect(authService.loginWithOAuthProfile).toHaveBeenCalledWith({
      provider: AuthProvider.GOOGLE,
      providerUserId: 'google-123',
      displayName: 'Jane Doe',
    });
  });

  it('FacebookStrategy.validate links the Facebook identity', async () => {
    const strategy = new FacebookStrategy(configService, authService);
    const profile = { id: 'fb-9', name: { givenName: 'Jane' } } as FacebookProfile;

    await expect(strategy.validate('at', 'rt', profile)).resolves.toEqual(AUTH_RESPONSE);
    expect(authService.loginWithOAuthProfile).toHaveBeenCalledWith({
      provider: AuthProvider.FACEBOOK,
      providerUserId: 'fb-9',
      displayName: 'Jane',
    });
  });
});

describe('OAuth controllers', () => {
  it('return the token pair produced by the strategy', () => {
    const request = { user: AUTH_RESPONSE } as unknown as Parameters<GoogleOauthController['callback']>[0];

    expect(new GoogleOauthController().callback(request)).toBe(AUTH_RESPONSE);
    expect(new FacebookOauthController().callback(request)).toBe(AUTH_RESPONSE);
    expect(new GoogleOauthController().start()).toBeUndefined();
    expect(new FacebookOauthController().start()).toBeUndefined();
  });
});
