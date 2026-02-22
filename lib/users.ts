import { hashPassword } from "./auth";
import { prisma } from "./prisma";

export type UserRecord = {
  email: string;
  passwordHash: string;
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

function mapUser(row: {
  email: string;
  passwordHash: string;
  name: string;
  points: number;
  level: number;
  role: string;
}): UserRecord {
  return {
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    points: row.points,
    level: row.level,
    role: row.role === "admin" ? "admin" : "user",
  };
}

export async function readUsers(): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
  });
  return users.map(mapUser);
}

export async function findUserByEmail(email: string) {
  if (typeof email !== "string") {
    return null;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  return user ? mapUser(user) : null;
}

export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "user";
  points?: number;
}) {
  const email = params.email.trim().toLowerCase();
  const points = normalizePoints(params.points);
  const level = calculateLevelFromPoints(points);
  const passwordHash = hashPassword(params.password);

  try {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: params.name.trim() || email.split("@")[0],
        points,
        level,
        role: params.role ?? "user",
      },
    });
    return mapUser(created);
  } catch {
    throw new Error("User already exists");
  }
}

export async function addPointsToUser(email: string, delta: number) {
  const current = await findUserByEmail(email);
  if (!current) {
    return null;
  }

  const nextPoints = current.points + delta;
  const nextLevel = calculateLevelFromPoints(nextPoints);
  const updated = await prisma.user.update({
    where: { email: current.email },
    data: {
      points: nextPoints,
      level: nextLevel,
    },
  });

  return mapUser(updated);
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

  const updated = await prisma.user.update({
    where: { email: current.email },
    data: {
      name: nextName,
      points: nextPoints,
      level: nextLevel,
      role: nextRole,
      passwordHash: nextPasswordHash,
    },
  });

  return mapUser(updated);
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
