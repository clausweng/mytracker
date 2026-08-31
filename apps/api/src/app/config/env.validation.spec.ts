import { validateEnvironment } from './env.validation.js';

const VALID = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'access',
  JWT_REFRESH_SECRET: 'refresh',
};

describe('validateEnvironment', () => {
  it('applies the documented defaults', () => {
    const config = validateEnvironment({ ...VALID });

    expect(config).toMatchObject({
      API_PORT: 3000,
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:4200',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '30d',
    });
  });

  it('coerces the port and keeps optional OAuth settings', () => {
    const config = validateEnvironment({
      ...VALID,
      API_PORT: '8080',
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'google-id',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
    });

    expect(config.API_PORT).toBe(8080);
    expect(config.NODE_ENV).toBe('test');
    expect(config.GOOGLE_CLIENT_ID).toBe('google-id');
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => validateEnvironment({ JWT_ACCESS_SECRET: 'access' })).toThrow(
      /Invalid environment configuration/,
    );
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnvironment({ ...VALID, API_PORT: '70000' })).toThrow(/Invalid environment configuration/);
  });
});
