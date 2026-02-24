import { prisma } from "./prisma";
import type { UserSegment } from "./users";
import { getUserActiveStoreEffects } from "./store";

export type AppSettings = {
  maxRegisteredUsers: number;
  questionChunkSize: number;
  aiChatAllowFree: boolean;
  aiChatAllowPlus: boolean;
  aiChatAllowPro: boolean;
  aiChatAllowPremium: boolean;
  forumMinLevel: number;
};

const SETTINGS_ROW_ID = 1;
const DEFAULT_MAX_REGISTERED_USERS = 1000;
const DEFAULT_FORUM_MIN_LEVEL = 2;
const DEFAULT_QUESTION_CHUNK_SIZE = 20;
const MAX_QUESTION_CHUNK_SIZE = 100;

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
        questionChunkSize: DEFAULT_QUESTION_CHUNK_SIZE,
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
    questionChunkSize: Math.max(
      1,
      Math.min(
        MAX_QUESTION_CHUNK_SIZE,
        normalizeLimit(config.questionChunkSize, DEFAULT_QUESTION_CHUNK_SIZE),
      ),
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
  const nextQuestionChunkSize =
    typeof input.questionChunkSize === "number"
      ? Math.max(
          1,
          Math.min(
            MAX_QUESTION_CHUNK_SIZE,
            normalizeLimit(input.questionChunkSize, current.questionChunkSize),
          ),
        )
      : current.questionChunkSize;
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
      questionChunkSize: nextQuestionChunkSize,
      aiChatAllowFree: nextAiChatAllowFree,
      aiChatAllowPlus: nextAiChatAllowPlus,
      aiChatAllowPro: nextAiChatAllowPro,
      aiChatAllowPremium: nextAiChatAllowPremium,
      forumMinLevel: nextForumMinLevel,
    },
    update: {
      maxRegisteredUsers: nextMaxRegisteredUsers,
      questionChunkSize: nextQuestionChunkSize,
      aiChatAllowFree: nextAiChatAllowFree,
      aiChatAllowPlus: nextAiChatAllowPlus,
      aiChatAllowPro: nextAiChatAllowPro,
      aiChatAllowPremium: nextAiChatAllowPremium,
      forumMinLevel: nextForumMinLevel,
    },
  });

  return {
    maxRegisteredUsers: updated.maxRegisteredUsers,
    questionChunkSize: updated.questionChunkSize,
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
    select: { aiDailyQuota: true, aiExtraUsageCredits: true },
  });
  const limit =
    typeof user?.aiDailyQuota === "number" && user.aiDailyQuota > 0
      ? user.aiDailyQuota
      : defaultQuota;
  const storeEffects = await getUserActiveStoreEffects(userEmail);
  const bonusFromActiveItems = Math.max(0, storeEffects.extraAiDailyQuota);
  const oneTimeCredits =
    typeof user?.aiExtraUsageCredits === "number" ? Math.max(0, user.aiExtraUsageCredits) : 0;
  const effectiveLimit = limit + bonusFromActiveItems + oneTimeCredits;
  const usageDate = getUtcDayKey();
  const used = await getDailyAiUsageCount(userEmail, usageDate);
  const remaining = Math.max(0, effectiveLimit - used);

  return {
    allowed: remaining > 0,
    used,
    remaining,
    limit: effectiveLimit,
    usageDate,
  };
}

export async function incrementDailyAiUsage(userEmail: string) {
  // Consume one quota unit after a successful model call.
  const usageDate = getUtcDayKey();
  await prisma.$transaction(async (tx) => {
    const [settings, user, effects] = await Promise.all([
      tx.user.findUnique({
        where: { email: userEmail },
        select: { aiDailyQuota: true, aiExtraUsageCredits: true },
      }),
      tx.dailyAiUsage.findUnique({
        where: {
          userEmail_usageDate: {
            userEmail,
            usageDate,
          },
        },
      }),
      getUserActiveStoreEffects(userEmail, tx),
    ]);

    const rawDefaultQuota = process.env.DEFAULT_AI_DAILY_QUOTA_PER_USER?.trim();
    const parsedDefaultQuota = rawDefaultQuota ? Number.parseInt(rawDefaultQuota, 10) : Number.NaN;
    const defaultQuota =
      Number.isFinite(parsedDefaultQuota) && parsedDefaultQuota > 0 ? parsedDefaultQuota : 20;
    const baseLimit =
      typeof settings?.aiDailyQuota === "number" && settings.aiDailyQuota > 0
        ? settings.aiDailyQuota
        : defaultQuota;
    const equippedBonus = Math.max(0, effects.extraAiDailyQuota);
    const freeLimitBeforeCredits = baseLimit + equippedBonus;
    const currentUsed = user?.count ?? 0;

    await tx.dailyAiUsage.upsert({
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

    if (currentUsed >= freeLimitBeforeCredits) {
      await tx.user.updateMany({
        where: {
          email: userEmail,
          aiExtraUsageCredits: {
            gt: 0,
          },
        },
        data: {
          aiExtraUsageCredits: {
            decrement: 1,
          },
        },
      });
    }
  });
}
