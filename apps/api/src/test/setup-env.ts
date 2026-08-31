import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';

// e2e specs talk to the real local Postgres; unit specs simply need the JWT
// secrets to be present. Both are provided by the repo-root .env file.
config({ path: resolve(__dirname, '../../../../.env'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_TTL ??= '15m';
process.env.JWT_REFRESH_TTL ??= '30d';
