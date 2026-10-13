import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { resolve } from 'node:path';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/index.js';
import { DatabaseModule } from './database/index.js';
import { AuthModule } from './auth/index.js';
import { OauthModule } from './oauth/index.js';
import { ExercisesModule } from './exercises/index.js';
import { UsersModule } from './users/index.js';
import { DaysModule } from './days/index.js';
import { LogsModule } from './logs/index.js';
import { StatsModule } from './stats/index.js';
import { HealthController } from './health/health.controller.js';

/**
 * Application root. Rate limiting is configured once here and applied to the
 * auth routes via `ThrottlerGuard`.
 */
@Module({
  imports: [
    AppConfigModule,
    ServeStaticModule.forRoot({
      rootPath: resolve(
        process.cwd(),
        process.env.WEB_DIST_PATH ?? 'dist/apps/web/browser',
      ),
      exclude: ['/api/{*path}'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    DatabaseModule,
    AuthModule,
    OauthModule.forRoot(),
    UsersModule,
    ExercisesModule,
    DaysModule,
    LogsModule,
    StatsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
