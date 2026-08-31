import { Module, type DynamicModule, type Provider, type Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module.js';
import { FacebookOauthController, GoogleOauthController } from './oauth.controller.js';
import { FacebookStrategy } from './strategies/facebook.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';

/**
 * Registers the OAuth2 strategies and their routes only for the providers
 * that are actually configured. `process.env` is read directly because the
 * decision must be made while the module graph is built, before DI is ready.
 */
@Module({})
export class OauthModule {
  static forRoot(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const providers: Provider[] = [];
    const controllers: Type<unknown>[] = [];

    if (env['GOOGLE_CLIENT_ID']) {
      providers.push(GoogleStrategy);
      controllers.push(GoogleOauthController);
    }

    if (env['FACEBOOK_CLIENT_ID']) {
      providers.push(FacebookStrategy);
      controllers.push(FacebookOauthController);
    }

    return {
      module: OauthModule,
      imports: [ConfigModule, PassportModule, AuthModule],
      controllers,
      providers,
    };
  }
}
