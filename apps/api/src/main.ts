import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { configureApp, GLOBAL_PREFIX, SWAGGER_PATH } from './app/bootstrap.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  const port = app.get(ConfigService).get<number>('PORT') ?? 3000;

  await app.listen(port);

  Logger.log(`🚀 API ready on http://localhost:${port}/${GLOBAL_PREFIX}`, 'Bootstrap');
  Logger.log(`📚 Swagger UI on http://localhost:${port}/${SWAGGER_PATH}`, 'Bootstrap');
}

void bootstrap();
