import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export type DrizzleDatabase = NodePgDatabase<typeof schema>;

export interface DrizzleConnection {
  pool: Pool;
  db: DrizzleDatabase;
}

/**
 * Creates the pg Pool + Drizzle client pair. Extracted from the module so it
 * can be reused by the seed script without booting the full Nest app.
 */
export function createDrizzleDatabase(connectionString: string): DrizzleConnection {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { pool, db };
}
