import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';

/**
 * API versioning is expressed through a single global prefix (`api/v1`)
 * instead of Nest's `VersioningType.URI`: there is exactly one version in this
 * increment, and one prefix keeps controller decorators free of version noise.
 */
export const GLOBAL_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';

/**
 * Applies every cross-cutting concern (prefix, security headers, CORS,
 * validation, error envelope, request logging, Swagger). Shared by the
 * production bootstrap and the e2e test harness so both behave identically.
 */
export function configureApp(app: INestApplication): INestApplication {
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.use(helmet());
  app.enableCors({ origin: configService.get<string>('CORS_ORIGIN') ?? '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Exercise Tracker API')
      .setDescription('Offline-first exercise tracking: auth, exercises, day sessions, rep logs and statistics.')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build(),
  );
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  return app;
}
