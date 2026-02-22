import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(scriptDir, "..");
  const parentRoot = path.resolve(projectRoot, "..");
  loadEnvFile(path.join(parentRoot, ".env"));
  loadEnvFile(path.join(parentRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env"));
  loadEnvFile(path.join(projectRoot, ".env.local"));
}

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }
  return url;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function calculateLevelFromPoints(points) {
  if (!Number.isFinite(points) || points < 10) {
    return 0;
  }

  let level = 1;
  while (points >= 10 ** (level + 1)) {
    level += 1;
  }
  return level;
}

async function ensureSchema(pool) {
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
}

async function main() {
  loadEnv();
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  await ensureSchema(pool);

  const seeds = [
    {
      email: "test@example.com",
      name: "Test User",
      password: "password123",
      role: "user",
      points: 0,
    },
    {
      email: "admin@example.com",
      name: "Admin User",
      password: "admin12345",
      role: "admin",
      points: 0,
    },
  ];

  let createdCount = 0;

  for (const seed of seeds) {
    const email = seed.email.toLowerCase();
    const existsResult = await pool.query(
      `SELECT email FROM users WHERE email = $1 LIMIT 1`,
      [email],
    );

    if (existsResult.rowCount && existsResult.rowCount > 0) {
      await pool.query(
        `UPDATE users
         SET name = $2, role = $3
         WHERE email = $1`,
        [email, seed.name, seed.role],
      );
      continue;
    }

    const points = seed.points;
    await pool.query(
      `INSERT INTO users (email, password_hash, name, points, level, role)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [email, hashPassword(seed.password), seed.name, points, calculateLevelFromPoints(points), seed.role],
    );
    createdCount += 1;
  }

  const allUsers = await pool.query(`SELECT email, points FROM users`);
  for (const row of allUsers.rows) {
    const points = Number(row.points) || 0;
    await pool.query(
      `UPDATE users SET level = $2 WHERE email = $1`,
      [row.email, calculateLevelFromPoints(points)],
    );
  }

  await pool.end();
  console.log(`Seeding complete. Added ${createdCount} user(s).`);
}

main().catch((error) => {
  console.error("Failed to seed users:", error);
  process.exit(1);
});
