import { config } from 'dotenv';
import { resolve } from 'path';
import { defineConfig } from 'drizzle-kit';

config({ path: resolve(process.cwd(), '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set (see .env.example) to run Drizzle Kit.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/app/database/schema/index.ts',
  out: './src/app/database/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
