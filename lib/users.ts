import { hashPassword } from "./auth";
import { prisma } from "./prisma";

export type UserSegment = "Free" | "Plus" | "Pro" | "Premium";

const allowedSegments: UserSegment[] = ["Free", "Plus", "Pro", "Premium"];

export type UserRecord = {
  email: string;
  passwordHash: string;
  name: string;
  segment: UserSegment;
  avatarUrl: string | null;
  points: number;
  level: number;
  role: "admin" | "user";
  aiDailyQuota: number;
};

export function isUserSegment(value: string): value is UserSegment {
  // Validate user segment values used by admin API/forms.
  return allowedSegments.includes(value as UserSegment);
}

function normalizeUserSegment(value?: string | null): UserSegment {
  // Keep unknown/empty segment values on a safe default.
  const input = (value ?? "").trim();
  return isUserSegment(input) ? input : "Free";
}

function getDefaultAiDailyQuotaPerUser() {
  // Read fallback per-user daily AI quota from env with a safe default.
  const raw = process.env.DEFAULT_AI_DAILY_QUOTA_PER_USER?.trim();
  if (!raw) {
    return 20;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export function calculateLevelFromPoints(points: number) {
  // Convert total points into a level using powers-of-10 thresholds.
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
  // Coerce unknown point input into a safe integer value.
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.trunc(value);
}

function mapUser(row: {
  email: string;
  passwordHash: string;
  name: string;
  segment?: string;
  avatarUrl?: string | null;
  points: number;
  level: number;
  role: string;
  aiDailyQuota: number | null;
  createdAt?: Date;
}): UserRecord {
  // Map raw database user row into the typed app-level user record.
  const defaultAiDailyQuota = getDefaultAiDailyQuotaPerUser();
  return {
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    segment: normalizeUserSegment(row.segment),
    avatarUrl: row.avatarUrl ?? null,
    points: row.points,
    level: row.level,
    role: row.role === "admin" ? "admin" : "user",
    aiDailyQuota:
      typeof row.aiDailyQuota === "number" && row.aiDailyQuota > 0
        ? row.aiDailyQuota
        : defaultAiDailyQuota,
  };
}

export async function readUsers(): Promise<UserRecord[]> {
  // Read all users sorted by email for predictable admin listing.
  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
  });
  return users.map(mapUser);
}

export async function countUsers() {
  // Return total number of registered user accounts.
  return prisma.user.count();
}

export async function updateAllUsersAiDailyQuota(aiDailyQuota: number) {
  // Apply one daily AI quota value to all existing users.
  return prisma.user.updateMany({
    data: {
      aiDailyQuota,
    },
  });
}

export async function findUserByEmail(email: string) {
  // Find one user by normalized email, or return null when invalid/missing.
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
  segment?: UserSegment;
  avatarUrl?: string | null;
  role?: "admin" | "user";
  points?: number;
  aiDailyQuota?: number;
}) {
  // Create a new user with hashed password and computed starting level.
  const email = params.email.trim().toLowerCase();
  const points = normalizePoints(params.points);
  const level = calculateLevelFromPoints(points);
  const passwordHash = hashPassword(params.password);
  const defaultAiDailyQuota = getDefaultAiDailyQuotaPerUser();
  const aiDailyQuota =
    typeof params.aiDailyQuota === "number" && Number.isFinite(params.aiDailyQuota)
      ? Math.max(1, Math.trunc(params.aiDailyQuota))
      : defaultAiDailyQuota;
  const avatarUrl =
    typeof params.avatarUrl === "string" && params.avatarUrl.trim()
      ? params.avatarUrl.trim()
      : null;

  try {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: params.name.trim() || email.split("@")[0],
        segment: params.segment ?? "Free",
        avatarUrl,
        points,
        level,
        role: params.role ?? "user",
        aiDailyQuota,
      },
    });
    return mapUser(created);
  } catch {
    throw new Error("User already exists");
  }
}

export async function addPointsToUser(email: string, delta: number) {
  // Increment a user's points and recompute level from the new total.
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
  segment?: UserSegment;
  avatarUrl?: string | null;
  role: "admin" | "user";
  points?: number;
  aiDailyQuota?: number;
}) {
  // Admin wrapper around createUser that requires explicit role input.
  return createUser({
    email: params.email,
    password: params.password,
    name: params.name,
    segment: params.segment,
    avatarUrl: params.avatarUrl,
    role: params.role,
    points: params.points ?? 0,
    aiDailyQuota: params.aiDailyQuota,
  });
}

export async function updateUserByAdmin(params: {
  email: string;
  name?: string;
  segment?: UserSegment;
  avatarUrl?: string | null;
  points?: number;
  level?: number;
  role?: "admin" | "user";
  password?: string;
  aiDailyQuota?: number;
}) {
  // Admin update path for profile, role, points, optional manual level, and optional password.
  const current = await findUserByEmail(params.email);
  if (!current) {
    return null;
  }

  const nextPoints =
    typeof params.points === "number" ? normalizePoints(params.points) : current.points;
  // Allow admin to override level directly; otherwise derive level from points.
  const nextLevel =
    typeof params.level === "number" && Number.isFinite(params.level)
      ? Math.max(0, Math.trunc(params.level))
      : calculateLevelFromPoints(nextPoints);
  const nextName =
    typeof params.name === "string" ? params.name.trim() || current.name : current.name;
  const nextSegment = params.segment ?? current.segment;
  const nextAvatarUrl =
    typeof params.avatarUrl === "string"
      ? params.avatarUrl.trim() || null
      : current.avatarUrl;
  const nextRole = params.role ?? current.role;
  const nextPasswordHash = params.password
    ? hashPassword(params.password)
    : current.passwordHash;
  const nextAiDailyQuota =
    typeof params.aiDailyQuota === "number" && Number.isFinite(params.aiDailyQuota)
      ? Math.max(1, Math.trunc(params.aiDailyQuota))
      : current.aiDailyQuota;

  const updated = await prisma.user.update({
    where: { email: current.email },
    data: {
      name: nextName,
      segment: nextSegment,
      avatarUrl: nextAvatarUrl,
      points: nextPoints,
      level: nextLevel,
      role: nextRole,
      passwordHash: nextPasswordHash,
      aiDailyQuota: nextAiDailyQuota,
    },
  });

  return mapUser(updated);
}

export async function updateUserAvatar(email: string, avatarUrl: string | null) {
  // Update one user's avatar URL/base64 image reference.
  const current = await findUserByEmail(email);
  if (!current) {
    return null;
  }

  const nextAvatarUrl =
    typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
  const updated = await prisma.user.update({
    where: { email: current.email },
    data: {
      avatarUrl: nextAvatarUrl,
    },
  });

  return mapUser(updated);
}

export async function updateUserProfile(params: {
  email: string;
  name?: string;
  avatarUrl?: string | null;
}) {
  // Update basic self-managed profile fields for a user.
  const current = await findUserByEmail(params.email);
  if (!current) {
    return null;
  }

  const nextName =
    typeof params.name === "string" ? params.name.trim() || current.name : current.name;
  const nextAvatarUrl =
    typeof params.avatarUrl === "string"
      ? params.avatarUrl.trim() || null
      : current.avatarUrl;

  const updated = await prisma.user.update({
    where: { email: current.email },
    data: {
      name: nextName,
      avatarUrl: nextAvatarUrl,
    },
  });

  return mapUser(updated);
}

export async function deleteUserByAdmin(email: string) {
  // Remove one user account by email for admin management actions.
  const current = await findUserByEmail(email);
  if (!current) {
    return false;
  }

  await prisma.user.delete({
    where: {
      email: current.email,
    },
  });
  return true;
}

export function sanitizeUser(user: UserRecord) {
  // Remove sensitive fields before returning user data to clients.
  return {
    email: user.email,
    name: user.name,
    segment: user.segment,
    avatarUrl: user.avatarUrl,
    points: user.points,
    level: user.level,
    role: user.role,
    aiDailyQuota: user.aiDailyQuota,
  };
}
