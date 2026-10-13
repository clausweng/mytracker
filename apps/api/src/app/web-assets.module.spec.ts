import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { configureApp } from './bootstrap.js';

describe('WebAssetsModule', () => {
  let app: INestApplication;
  let assetsPath: string;
  let previousWebDistPath: string | undefined;

  beforeAll(async () => {
    assetsPath = await mkdtemp(join(tmpdir(), 'exercise-tracker-web-'));
    await writeFile(
      join(assetsPath, 'index.html'),
      '<!doctype html><title>Exercise Tracker</title>',
    );
    previousWebDistPath = process.env.WEB_DIST_PATH;
    process.env.WEB_DIST_PATH = assetsPath;
    process.env.DATABASE_URL ??= 'postgres://test:test@localhost:5432/test';

    const { AppModule } = await import('./app.module.js');
    app = configureApp(await NestFactory.create(AppModule));
    await app.listen(0);
  });

  afterAll(async () => {
    await app?.close();
    if (assetsPath) {
      await rm(assetsPath, { recursive: true, force: true });
    }
    if (previousWebDistPath === undefined) {
      delete process.env.WEB_DIST_PATH;
    } else {
      process.env.WEB_DIST_PATH = previousWebDistPath;
    }
  });

  it('serves the SPA shell for the root and client-side routes', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get('/')
      .expect(200)
      .expect(/Exercise Tracker/);
    await request(server)
      .get('/today')
      .expect(200)
      .expect(/Exercise Tracker/);
  });

  it('does not send API requests through the SPA fallback', async () => {
    const server = app.getHttpServer();

    await request(server).get('/api/v1/health').expect(200, { status: 'ok' });
    await request(server).get('/api/v1/unknown').expect(404);
  });
});
