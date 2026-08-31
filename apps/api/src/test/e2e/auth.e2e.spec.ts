import request from 'supertest';
import type { AuthResponse } from '@exercise-tracker/shared-types';
import { API, cleanupE2eApp, createE2eApp, uniqueUsername, type E2eContext } from './e2e.harness.js';

describe('Auth flow (e2e)', () => {
  let context: E2eContext;
  const password = 'super-secret-password';
  let username: string;

  beforeAll(async () => {
    context = await createE2eApp();
    username = uniqueUsername(context);
  });

  afterAll(async () => {
    await cleanupE2eApp(context);
  });

  it('registers, logs in, refreshes, reads the profile and logs out', async () => {
    const server = context.app.getHttpServer();

    const registered = await request(server)
      .post(`${API}/auth/register`)
      .send({ username, password, displayName: 'E2E User', hintQuestion: 'First pet?', hintAnswer: 'Rex' })
      .expect(201);
    const registerBody = registered.body as AuthResponse;
    expect(registerBody.user.username).toBe(username);
    expect(registerBody.accessToken).toBeTruthy();

    await request(server)
      .post(`${API}/auth/register`)
      .send({ username, password, displayName: 'E2E User', hintQuestion: 'First pet?', hintAnswer: 'Rex' })
      .expect(409);

    const loggedIn = await request(server).post(`${API}/auth/login`).send({ username, password }).expect(200);
    const loginBody = loggedIn.body as AuthResponse;

    await request(server).post(`${API}/auth/login`).send({ username, password: 'wrong-password' }).expect(401);

    const refreshed = await request(server)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: loginBody.refreshToken })
      .expect(200);
    const refreshBody = refreshed.body as AuthResponse;
    expect(refreshBody.refreshToken).not.toBe(loginBody.refreshToken);

    // The rotated token is single use.
    await request(server).post(`${API}/auth/refresh`).send({ refreshToken: loginBody.refreshToken }).expect(401);

    const profile = await request(server)
      .get(`${API}/users/me`)
      .set('Authorization', `Bearer ${refreshBody.accessToken}`)
      .expect(200);
    expect(profile.body).toMatchObject({ username, displayName: 'E2E User', role: 'USER' });

    await request(server).get(`${API}/users/me`).expect(401);

    await request(server).get(`${API}/auth/hint/${username}`).expect(200, { hintQuestion: 'First pet?' });
    await request(server).get(`${API}/auth/hint/does-not-exist`).expect(404);

    await request(server)
      .post(`${API}/auth/logout`)
      .send({ refreshToken: refreshBody.refreshToken })
      .expect(204);
    await request(server).post(`${API}/auth/refresh`).send({ refreshToken: refreshBody.refreshToken }).expect(401);
  });

  it('resets the password through the hint answer', async () => {
    const server = context.app.getHttpServer();
    const resetUsername = uniqueUsername(context);

    await request(server)
      .post(`${API}/auth/register`)
      .send({
        username: resetUsername,
        password,
        displayName: 'Reset User',
        hintQuestion: 'First pet?',
        hintAnswer: 'Rex',
      })
      .expect(201);

    await request(server)
      .post(`${API}/auth/reset-password`)
      .send({ username: resetUsername, hintAnswer: 'wrong', newPassword: 'another-password' })
      .expect(401);

    await request(server)
      .post(`${API}/auth/reset-password`)
      .send({ username: resetUsername, hintAnswer: ' rex ', newPassword: 'another-password' })
      .expect(200);

    await request(server)
      .post(`${API}/auth/login`)
      .send({ username: resetUsername, password: 'another-password' })
      .expect(200);
  });

  it('rejects payloads that fail validation', async () => {
    await request(context.app.getHttpServer())
      .post(`${API}/auth/register`)
      .send({ username: 'ab', password: 'short' })
      .expect(400);
  });

  it('serves the health probe and the Swagger document', async () => {
    const server = context.app.getHttpServer();

    await request(server).get(`${API}/health`).expect(200, { status: 'ok' });
    const document = await request(server).get('/api/docs-json').expect(200);
    expect(document.body).toMatchObject({ info: { title: 'Exercise Tracker API' } });
  });
});
