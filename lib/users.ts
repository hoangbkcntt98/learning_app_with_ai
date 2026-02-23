import { hashPassword } from "./auth";
import { prisma } from "./prisma";
import { ensureQuestionFields } from "./question-fields";
import { getUserActiveStoreEffects } from "./store";

export type UserSegment = "Free" | "Plus" | "Pro" | "Premium";

const allowedSegments: UserSegment[] = ["Free", "Plus", "Pro", "Premium"];

export type UserRecord = {
  email: string;
  passwordHash: string;
  name: string;
  segment: UserSegment;
  avatarUrl: string | null;
  points: number;
  gold: number;
  aiExtraUsageCredits: number;
  level: number;
  correctStreak: number;
  role: "admin" | "user";
  aiDailyQuota: number;
  questionFieldIds: number[];
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
  while (points >= 10 ** (level + 1) / 2) {
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
  gold?: number;
  aiExtraUsageCredits?: number;
  level: number;
  correctStreak?: number;
  role: string;
  aiDailyQuota: number | null;
  createdAt?: Date;
  questionFieldAccesses?: Array<{ questionFieldId: number }>;
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
    gold: typeof row.gold === "number" && Number.isFinite(row.gold) ? Math.max(0, Math.trunc(row.gold)) : 0,
    aiExtraUsageCredits:
      typeof row.aiExtraUsageCredits === "number" && Number.isFinite(row.aiExtraUsageCredits)
        ? Math.max(0, Math.trunc(row.aiExtraUsageCredits))
        : 0,
    level: row.level,
    correctStreak:
      typeof row.correctStreak === "number" && Number.isFinite(row.correctStreak)
        ? Math.max(0, Math.trunc(row.correctStreak))
        : 0,
    role: row.role === "admin" ? "admin" : "user",
    aiDailyQuota:
      typeof row.aiDailyQuota === "number" && row.aiDailyQuota > 0
        ? row.aiDailyQuota
        : defaultAiDailyQuota,
    questionFieldIds: Array.from(
      new Set((row.questionFieldAccesses ?? []).map((item) => item.questionFieldId)),
    ),
  };
}

function normalizeQuestionFieldIds(input?: number[]) {
  // Normalize requested question-field ids into unique positive integers.
  if (!Array.isArray(input)) {
    return [];
  }
  return Array.from(
    new Set(
      input
        .map((item) => (Number.isFinite(item) ? Math.trunc(item) : NaN))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
}

async function readAllQuestionFieldIds() {
  // Return all existing question field ids for fallback/default access.
  await ensureQuestionFields();
  const fields = await prisma.questionField.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return fields.map((item) => item.id);
}

async function resolveRequestedQuestionFieldIds(input?: number[]) {
  // Use explicit valid ids when provided; otherwise fallback to all fields.
  const normalized = normalizeQuestionFieldIds(input);
  if (normalized.length === 0) {
    return readAllQuestionFieldIds();
  }
  const existing = await prisma.questionField.findMany({
    where: { id: { in: normalized } },
    select: { id: true },
  });
  return Array.from(new Set(existing.map((item) => item.id)));
}

export async function readUsers(): Promise<UserRecord[]> {
  // Read all users sorted by email for predictable admin listing.
  const users = await prisma.user.findMany({
    include: {
      questionFieldAccesses: {
        select: {
          questionFieldId: true,
        },
      },
    },
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
    include: {
      questionFieldAccesses: {
        select: {
          questionFieldId: true,
        },
      },
    },
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
  gold?: number;
  aiDailyQuota?: number;
  questionFieldIds?: number[];
}) {
  // Create a new user with hashed password and computed starting level.
  const email = params.email.trim().toLowerCase();
  const points = normalizePoints(params.points);
  const gold =
    typeof params.gold === "number" && Number.isFinite(params.gold)
      ? Math.max(0, Math.trunc(params.gold))
      : 0;
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
  const questionFieldIds = await resolveRequestedQuestionFieldIds(params.questionFieldIds);
  if (questionFieldIds.length === 0) {
    throw new Error("At least one question field is required");
  }

  try {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: params.name.trim() || email.split("@")[0],
        segment: params.segment ?? "Free",
        avatarUrl,
        points,
        gold,
        level,
        role: params.role ?? "user",
        aiDailyQuota,
        questionFieldAccesses: {
          createMany: {
            data: questionFieldIds.map((questionFieldId) => ({ questionFieldId })),
          },
        },
      },
      include: {
        questionFieldAccesses: {
          select: {
            questionFieldId: true,
          },
        },
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

export type ApplyGameAnswerResult = {
  user: UserRecord;
  delta: number;
  bonusPoints: number;
  goldDelta: number;
  streak: number;
};

export async function applyGameAnswerResult(
  email: string,
  isCorrect: boolean,
): Promise<ApplyGameAnswerResult | null> {
  // Apply base score change, track correct-answer streak, and grant 5-in-a-row bonus.
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        questionFieldAccesses: {
          select: {
            questionFieldId: true,
          },
        },
      },
    });
    if (!current) {
      return null;
    }

    const baseDelta = isCorrect ? 5 : -5;
    const storeEffects = await getUserActiveStoreEffects(normalizedEmail, tx);
    const goldDelta = isCorrect ? 1 + storeEffects.bonusGoldOnCorrect : 0;
    const extraPointDelta = isCorrect ? storeEffects.bonusPointsOnCorrect : 0;
    const totalPointDelta = baseDelta + extraPointDelta;
    const previousStreak =
      typeof current.correctStreak === "number" ? Math.max(0, current.correctStreak) : 0;
    let nextPoints = current.points + totalPointDelta;
    const nextGold = Math.max(0, (typeof current.gold === "number" ? current.gold : 0) + goldDelta);
    let nextLevel = calculateLevelFromPoints(nextPoints);
    let nextStreak = isCorrect ? previousStreak + 1 : 0;
    let bonusPoints = 0;

    if (isCorrect && nextStreak >= 5) {
      // Reward when user reaches 5 consecutive correct answers.
      bonusPoints = nextLevel * 10;
      nextPoints += bonusPoints;
      nextLevel = calculateLevelFromPoints(nextPoints);
      nextStreak = 0;
    }

    const updated = await tx.user.update({
      where: { email: normalizedEmail },
      data: {
        points: nextPoints,
        gold: nextGold,
        level: nextLevel,
        correctStreak: nextStreak,
      },
      include: {
        questionFieldAccesses: {
          select: {
            questionFieldId: true,
          },
        },
      },
    });

    return {
      user: mapUser(updated),
      delta: totalPointDelta,
      bonusPoints,
      goldDelta,
      streak: nextStreak,
    };
  });
}

export async function createUserByAdmin(params: {
  email: string;
  password: string;
  name: string;
  segment?: UserSegment;
  avatarUrl?: string | null;
  role: "admin" | "user";
  points?: number;
  gold?: number;
  aiDailyQuota?: number;
  questionFieldIds?: number[];
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
    gold: params.gold ?? 0,
    aiDailyQuota: params.aiDailyQuota,
    questionFieldIds: params.questionFieldIds,
  });
}

export async function updateUserByAdmin(params: {
  email: string;
  name?: string;
  segment?: UserSegment;
  avatarUrl?: string | null;
  points?: number;
  gold?: number;
  level?: number;
  role?: "admin" | "user";
  password?: string;
  aiDailyQuota?: number;
  questionFieldIds?: number[];
}) {
  // Admin update path for profile, role, points, optional manual level, and optional password.
  const current = await findUserByEmail(params.email);
  if (!current) {
    return null;
  }

  const nextPoints =
    typeof params.points === "number" ? normalizePoints(params.points) : current.points;
  const nextGold =
    typeof params.gold === "number" && Number.isFinite(params.gold)
      ? Math.max(0, Math.trunc(params.gold))
      : current.gold;
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
  const shouldUpdateQuestionFields = Array.isArray(params.questionFieldIds);
  const nextQuestionFieldIds = shouldUpdateQuestionFields
    ? await resolveRequestedQuestionFieldIds(params.questionFieldIds)
    : current.questionFieldIds;
  if (nextQuestionFieldIds.length === 0) {
    throw new Error("At least one question field is required");
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { email: current.email },
      data: {
        name: nextName,
        segment: nextSegment,
        avatarUrl: nextAvatarUrl,
        points: nextPoints,
        gold: nextGold,
        level: nextLevel,
        role: nextRole,
        passwordHash: nextPasswordHash,
        aiDailyQuota: nextAiDailyQuota,
      },
      include: {
        questionFieldAccesses: {
          select: {
            questionFieldId: true,
          },
        },
      },
    }),
    ...(shouldUpdateQuestionFields
      ? [
          prisma.userQuestionFieldAccess.deleteMany({
            where: { userEmail: current.email },
          }),
          prisma.userQuestionFieldAccess.createMany({
            data: nextQuestionFieldIds.map((questionFieldId) => ({
              userEmail: current.email,
              questionFieldId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  return mapUser(updated);
}

export async function getUserAccessibleQuestionFieldIds(email: string) {
  // Return explicit field access ids, or fallback to all fields when none mapped.
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return [];
  }
  const mapped = await prisma.userQuestionFieldAccess.findMany({
    where: { userEmail: normalizedEmail },
    select: {
      questionFieldId: true,
    },
  });
  if (mapped.length > 0) {
    return Array.from(new Set(mapped.map((item) => item.questionFieldId)));
  }
  return readAllQuestionFieldIds();
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
    gold: user.gold,
    aiExtraUsageCredits: user.aiExtraUsageCredits,
    level: user.level,
    correctStreak: user.correctStreak,
    role: user.role,
    aiDailyQuota: user.aiDailyQuota,
    questionFieldIds: user.questionFieldIds,
  };
}
