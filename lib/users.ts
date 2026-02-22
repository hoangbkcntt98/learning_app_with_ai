import { hashPassword } from "./auth";
import { ensureSchema, getPool } from "./db";

export type UserRecord = {
  email: string;
  passwordHash: string;
  name: string;
  points: number;
  level: number;
  role: "admin" | "user";
};

type UserRow = {
  email: string;
  password_hash: string;
  name: string;
  points: number;
  level: number;
  role: "admin" | "user";
};

export function calculateLevelFromPoints(points: number) {
  if (!Number.isFinite(points) || points < 10) {
    return 0;
  }

  let level = 1;
  while (points >= 10 ** (level + 1)) {
    level += 1;
  }
  return level;
}

function normalizePoints(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(value);
}

function mapUser(row: UserRow): UserRecord {
  return {
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    points: row.points,
    level: row.level,
    role: row.role,
  };
}

export async function readUsers(): Promise<UserRecord[]> {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<UserRow>(
    `SELECT email, password_hash, name, points, level, role
     FROM users
     ORDER BY email ASC`,
  );
  return result.rows.map(mapUser);
}

export async function findUserByEmail(email: string) {
  await ensureSchema();
  const pool = getPool();
  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query<UserRow>(
    `SELECT email, password_hash, name, points, level, role
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [normalizedEmail],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "user";
  points?: number;
}) {
  await ensureSchema();
  const pool = getPool();

  const email = params.email.trim().toLowerCase();
  const points = normalizePoints(params.points);
  const level = calculateLevelFromPoints(points);
  const passwordHash = hashPassword(params.password);

  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, name, points, level, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING email, password_hash, name, points, level, role`,
      [email, passwordHash, params.name.trim() || email.split("@")[0], points, level, params.role ?? "user"],
    );
    return mapUser(result.rows[0]);
  } catch {
    throw new Error("User already exists");
  }
}

export async function addPointsToUser(email: string, delta: number) {
  await ensureSchema();
  const current = await findUserByEmail(email);
  if (!current) {
    return null;
  }

  const nextPoints = current.points + delta;
  const nextLevel = calculateLevelFromPoints(nextPoints);
  const pool = getPool();

  const result = await pool.query<UserRow>(
    `UPDATE users
     SET points = $2, level = $3
     WHERE email = $1
     RETURNING email, password_hash, name, points, level, role`,
    [current.email, nextPoints, nextLevel],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createUserByAdmin(params: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
  points?: number;
}) {
  return createUser({
    email: params.email,
    password: params.password,
    name: params.name,
    role: params.role,
    points: params.points ?? 0,
  });
}

export async function updateUserByAdmin(params: {
  email: string;
  name?: string;
  points?: number;
  role?: "admin" | "user";
  password?: string;
}) {
  await ensureSchema();
  const current = await findUserByEmail(params.email);
  if (!current) {
    return null;
  }

  const nextPoints =
    typeof params.points === "number" ? normalizePoints(params.points) : current.points;
  const nextLevel = calculateLevelFromPoints(nextPoints);
  const nextName =
    typeof params.name === "string" ? params.name.trim() || current.name : current.name;
  const nextRole = params.role ?? current.role;
  const nextPasswordHash = params.password
    ? hashPassword(params.password)
    : current.passwordHash;

  const pool = getPool();
  const result = await pool.query<UserRow>(
    `UPDATE users
     SET name = $2,
         points = $3,
         level = $4,
         role = $5,
         password_hash = $6
     WHERE email = $1
     RETURNING email, password_hash, name, points, level, role`,
    [current.email, nextName, nextPoints, nextLevel, nextRole, nextPasswordHash],
  );

  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export function sanitizeUser(user: UserRecord) {
  return {
    email: user.email,
    name: user.name,
    points: user.points,
    level: user.level,
    role: user.role,
  };
}
