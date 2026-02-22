import { Pool } from "pg";

declare global {
  var __pgPool: Pool | undefined;
  var __pgSchemaReady: Promise<void> | undefined;
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to your .env file.");
  }
  return url;
}

export function getPool() {
  if (!globalThis.__pgPool) {
    globalThis.__pgPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }
  return globalThis.__pgPool;
}

export function ensureSchema() {
  if (!globalThis.__pgSchemaReady) {
    globalThis.__pgSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          email TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          points INTEGER NOT NULL DEFAULT 0,
          level INTEGER NOT NULL DEFAULT 0,
          role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          level TEXT NOT NULL CHECK (level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
          prompt TEXT NOT NULL,
          option_1 TEXT NOT NULL,
          option_2 TEXT NOT NULL,
          option_3 TEXT NOT NULL,
          option_4 TEXT NOT NULL,
          correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })();
  }

  return globalThis.__pgSchemaReady;
}
