import { prisma } from "./prisma";
import type { UserSegment } from "./users";

export type AppSettings = {
  maxRegisteredUsers: number;
  aiChatAllowFree: boolean;
  aiChatAllowPlus: boolean;
  aiChatAllowPro: boolean;
  aiChatAllowPremium: boolean;
  forumMinLevel: number;
};

const SETTINGS_ROW_ID = 1;
const DEFAULT_MAX_REGISTERED_USERS = 1000;
const DEFAULT_FORUM_MIN_LEVEL = 2;

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
        aiChatAllowFree: false,
        aiChatAllowPlus: true,
        aiChatAllowPro: true,
        aiChatAllowPremium: true,
        forumMinLevel: DEFAULT_FORUM_MIN_LEVEL,
      },
    });
  }

  return {
    maxRegisteredUsers: normalizeLimit(
      config.maxRegisteredUsers,
      DEFAULT_MAX_REGISTERED_USERS,
    ),
    aiChatAllowFree: config.aiChatAllowFree,
    aiChatAllowPlus: config.aiChatAllowPlus,
    aiChatAllowPro: config.aiChatAllowPro,
    aiChatAllowPremium: config.aiChatAllowPremium,
    forumMinLevel: normalizeLimit(config.forumMinLevel, DEFAULT_FORUM_MIN_LEVEL),
  };
}

export async function updateAppSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  // Update admin-managed app settings and return the normalized latest values.
  const current = await readAppSettings();

  const nextMaxRegisteredUsers =
    typeof input.maxRegisteredUsers === "number"
      ? normalizeLimit(input.maxRegisteredUsers, current.maxRegisteredUsers)
      : current.maxRegisteredUsers;
  const nextAiChatAllowFree =
    typeof input.aiChatAllowFree === "boolean" ? input.aiChatAllowFree : current.aiChatAllowFree;
  const nextAiChatAllowPlus =
    typeof input.aiChatAllowPlus === "boolean" ? input.aiChatAllowPlus : current.aiChatAllowPlus;
  const nextAiChatAllowPro =
    typeof input.aiChatAllowPro === "boolean" ? input.aiChatAllowPro : current.aiChatAllowPro;
  const nextAiChatAllowPremium =
    typeof input.aiChatAllowPremium === "boolean"
      ? input.aiChatAllowPremium
      : current.aiChatAllowPremium;
  const nextForumMinLevel =
    typeof input.forumMinLevel === "number"
      ? normalizeLimit(input.forumMinLevel, current.forumMinLevel)
      : current.forumMinLevel;

  const updated = await prisma.appConfig.upsert({
    where: { id: SETTINGS_ROW_ID },
    create: {
      id: SETTINGS_ROW_ID,
      aiDailyQuotaPerUser: 20,
      maxRegisteredUsers: nextMaxRegisteredUsers,
      aiChatAllowFree: nextAiChatAllowFree,
      aiChatAllowPlus: nextAiChatAllowPlus,
      aiChatAllowPro: nextAiChatAllowPro,
      aiChatAllowPremium: nextAiChatAllowPremium,
      forumMinLevel: nextForumMinLevel,
    },
    update: {
      maxRegisteredUsers: nextMaxRegisteredUsers,
      aiChatAllowFree: nextAiChatAllowFree,
      aiChatAllowPlus: nextAiChatAllowPlus,
      aiChatAllowPro: nextAiChatAllowPro,
      aiChatAllowPremium: nextAiChatAllowPremium,
      forumMinLevel: nextForumMinLevel,
    },
  });

  return {
    maxRegisteredUsers: updated.maxRegisteredUsers,
    aiChatAllowFree: updated.aiChatAllowFree,
    aiChatAllowPlus: updated.aiChatAllowPlus,
    aiChatAllowPro: updated.aiChatAllowPro,
    aiChatAllowPremium: updated.aiChatAllowPremium,
    forumMinLevel: updated.forumMinLevel,
  };
}

export async function canAccessAiChatBySegment(segment: UserSegment) {
  // Resolve AI Chat permission from admin-configured segment flags.
  const settings = await readAppSettings();
  if (segment === "Premium") {
    return settings.aiChatAllowPremium;
  }
  if (segment === "Pro") {
    return settings.aiChatAllowPro;
  }
  if (segment === "Plus") {
    return settings.aiChatAllowPlus;
  }
  return settings.aiChatAllowFree;
}

export async function canAccessForumByLevel(level: number) {
  // Resolve forum permission from admin-configured minimum user level.
  const settings = await readAppSettings();
  return level >= settings.forumMinLevel;
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
