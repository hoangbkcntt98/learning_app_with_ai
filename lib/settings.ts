import { prisma } from "./prisma";

export type AppSettings = {
  maxRegisteredUsers: number;
};

const SETTINGS_ROW_ID = 1;
const DEFAULT_MAX_REGISTERED_USERS = 1000;

function normalizeLimit(value: number, fallback: number): number {
  // Ensure limits stay as safe positive integers.
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : fallback;
}

export async function readAppSettings(): Promise<AppSettings> {
  // Read settings from the singleton config row, creating defaults if missing.
  let config = await prisma.appConfig.findUnique({
    where: { id: SETTINGS_ROW_ID },
  });
  if (!config) {
    config = await prisma.appConfig.create({
      data: {
        id: SETTINGS_ROW_ID,
        aiDailyQuotaPerUser: 20,
        maxRegisteredUsers: DEFAULT_MAX_REGISTERED_USERS,
      },
    });
  }

  return {
    maxRegisteredUsers: normalizeLimit(
      config.maxRegisteredUsers,
      DEFAULT_MAX_REGISTERED_USERS,
    ),
  };
}

export async function updateAppSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  // Update admin-managed app settings and return the normalized latest values.
  const current = await readAppSettings();

  const nextMaxRegisteredUsers =
    typeof input.maxRegisteredUsers === "number"
      ? normalizeLimit(input.maxRegisteredUsers, current.maxRegisteredUsers)
      : current.maxRegisteredUsers;

  const updated = await prisma.appConfig.upsert({
    where: { id: SETTINGS_ROW_ID },
    create: {
      id: SETTINGS_ROW_ID,
      aiDailyQuotaPerUser: 20,
      maxRegisteredUsers: nextMaxRegisteredUsers,
    },
    update: {
      maxRegisteredUsers: nextMaxRegisteredUsers,
    },
  });

  return {
    maxRegisteredUsers: updated.maxRegisteredUsers,
  };
}

function getUtcDayKey(date = new Date()): string {
  // Use UTC date key so quota accounting is deterministic across servers.
  return date.toISOString().slice(0, 10);
}

export async function getDailyAiUsageCount(userEmail: string, usageDate = getUtcDayKey()) {
  // Return how many model calls a user has consumed for a UTC day.
  const usage = await prisma.dailyAiUsage.findUnique({
    where: {
      userEmail_usageDate: {
        userEmail,
        usageDate,
      },
    },
  });
  return usage?.count ?? 0;
}

export async function canUseAiModel(userEmail: string) {
  // Check whether the user still has remaining daily AI model quota.
  const rawDefaultQuota = process.env.DEFAULT_AI_DAILY_QUOTA_PER_USER?.trim();
  const parsedDefaultQuota = rawDefaultQuota ? Number.parseInt(rawDefaultQuota, 10) : Number.NaN;
  const defaultQuota = Number.isFinite(parsedDefaultQuota) && parsedDefaultQuota > 0
    ? parsedDefaultQuota
    : 20;
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { aiDailyQuota: true },
  });
  const limit =
    typeof user?.aiDailyQuota === "number" && user.aiDailyQuota > 0
      ? user.aiDailyQuota
      : defaultQuota;
  const usageDate = getUtcDayKey();
  const used = await getDailyAiUsageCount(userEmail, usageDate);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: remaining > 0,
    used,
    remaining,
    limit,
    usageDate,
  };
}

export async function incrementDailyAiUsage(userEmail: string) {
  // Consume one quota unit after a successful model call.
  const usageDate = getUtcDayKey();
  await prisma.dailyAiUsage.upsert({
    where: {
      userEmail_usageDate: {
        userEmail,
        usageDate,
      },
    },
    create: {
      userEmail,
      usageDate,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });
}
