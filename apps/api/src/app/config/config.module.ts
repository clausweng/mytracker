import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateEnvironment } from './env.validation.js';

/**
 * Loads and validates process.env once at bootstrap. Imported globally so
 * every feature module can inject `ConfigService` without re-importing.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
  ],
})
export class AppConfigModule {}
