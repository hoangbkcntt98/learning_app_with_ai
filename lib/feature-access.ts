import { prisma } from "./prisma";
import type { UserRecord, UserSegment } from "./users";

export type FeatureAccessRuleRecord = {
  featureId: number;
  featureKey: string;
  featureName: string;
  routePath: string;
  minLevel: number;
  allowFree: boolean;
  allowPlus: boolean;
  allowPro: boolean;
  allowPremium: boolean;
};

const defaultFeatureRules: FeatureAccessRuleRecord[] = [
  {
    featureId: 1,
    featureKey: "learning",
    featureName: "Learning",
    routePath: "/play",
    minLevel: 0,
    allowFree: true,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  },
  {
    featureId: 2,
    featureKey: "ai_chat",
    featureName: "AI Chat",
    routePath: "/ai-chat",
    minLevel: 0,
    allowFree: false,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  },
  {
    featureId: 3,
    featureKey: "forum",
    featureName: "Forum",
    routePath: "/forum",
    minLevel: 2,
    allowFree: true,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  },
  {
    featureId: 4,
    featureKey: "review",
    featureName: "Review",
    routePath: "/review",
    minLevel: 0,
    allowFree: true,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  },
  {
    featureId: 5,
    featureKey: "admin",
    featureName: "Admin",
    routePath: "/admin",
    minLevel: 0,
    allowFree: true,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  },
];

function normalizeLevel(value: number) {
  // Keep minimum level as a safe non-negative integer.
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.trunc(value));
}

function mapFeatureRule(row: {
  featureId: number;
  featureKey: string;
  featureName: string;
  routePath: string;
  minLevel: number;
  allowFree: boolean;
  allowPlus: boolean;
  allowPro: boolean;
  allowPremium: boolean;
}): FeatureAccessRuleRecord {
  // Map database rule row into app-level feature access shape.
  return {
    featureId: row.featureId,
    featureKey: row.featureKey,
    featureName: row.featureName,
    routePath: row.routePath,
    minLevel: normalizeLevel(row.minLevel),
    allowFree: row.allowFree,
    allowPlus: row.allowPlus,
    allowPro: row.allowPro,
    allowPremium: row.allowPremium,
  };
}

export async function ensureFeatureAccessRules() {
  // Seed default feature rows once, while preserving admin-edited values later.
  for (const feature of defaultFeatureRules) {
    const existing = await prisma.featureAccessRule.findUnique({
      where: { featureId: feature.featureId },
      select: { featureId: true },
    });
    if (existing) {
      continue;
    }
    await prisma.featureAccessRule.create({
      data: {
        featureId: feature.featureId,
        featureKey: feature.featureKey,
        featureName: feature.featureName,
        routePath: feature.routePath,
        minLevel: feature.minLevel,
        allowFree: feature.allowFree,
        allowPlus: feature.allowPlus,
        allowPro: feature.allowPro,
        allowPremium: feature.allowPremium,
      },
    });
  }
}

export async function readFeatureAccessRules() {
  // Return all feature rules sorted by numeric feature id.
  await ensureFeatureAccessRules();
  const rows = await prisma.featureAccessRule.findMany({
    orderBy: { featureId: "asc" },
  });
  return rows.map(mapFeatureRule);
}

export async function readFeatureAccessRuleByKey(featureKey: string) {
  // Fetch a single feature rule by key.
  await ensureFeatureAccessRules();
  const row = await prisma.featureAccessRule.findUnique({
    where: { featureKey },
  });
  return row ? mapFeatureRule(row) : null;
}

export async function updateFeatureAccessRule(params: {
  featureId: number;
  featureKey?: string;
  featureName?: string;
  routePath?: string;
  minLevel?: number;
  allowFree?: boolean;
  allowPlus?: boolean;
  allowPro?: boolean;
  allowPremium?: boolean;
}) {
  // Update rule fields selected by admin for one feature.
  const current = await prisma.featureAccessRule.findUnique({
    where: { featureId: params.featureId },
  });
  if (!current) {
    return null;
  }

  const updated = await prisma.featureAccessRule.update({
    where: { featureId: params.featureId },
    data: {
      featureKey:
        typeof params.featureKey === "string" && params.featureKey.trim()
          ? params.featureKey.trim()
          : current.featureKey,
      featureName:
        typeof params.featureName === "string" && params.featureName.trim()
          ? params.featureName.trim()
          : current.featureName,
      routePath:
        typeof params.routePath === "string" && params.routePath.trim()
          ? params.routePath.trim()
          : current.routePath,
      minLevel:
        typeof params.minLevel === "number"
          ? normalizeLevel(params.minLevel)
          : current.minLevel,
      allowFree:
        typeof params.allowFree === "boolean" ? params.allowFree : current.allowFree,
      allowPlus:
        typeof params.allowPlus === "boolean" ? params.allowPlus : current.allowPlus,
      allowPro:
        typeof params.allowPro === "boolean" ? params.allowPro : current.allowPro,
      allowPremium:
        typeof params.allowPremium === "boolean"
          ? params.allowPremium
          : current.allowPremium,
    },
  });

  return mapFeatureRule(updated);
}

export async function createFeatureAccessRule(params: {
  featureKey: string;
  featureName: string;
  routePath: string;
  minLevel?: number;
  allowFree?: boolean;
  allowPlus?: boolean;
  allowPro?: boolean;
  allowPremium?: boolean;
}) {
  // Create a new feature rule with the next available numeric feature id.
  await ensureFeatureAccessRules();
  const latest = await prisma.featureAccessRule.findFirst({
    orderBy: { featureId: "desc" },
    select: { featureId: true },
  });
  const nextFeatureId = (latest?.featureId ?? 0) + 1;

  const created = await prisma.featureAccessRule.create({
    data: {
      featureId: nextFeatureId,
      featureKey: params.featureKey.trim(),
      featureName: params.featureName.trim(),
      routePath: params.routePath.trim(),
      minLevel: normalizeLevel(params.minLevel ?? 0),
      allowFree: typeof params.allowFree === "boolean" ? params.allowFree : true,
      allowPlus: typeof params.allowPlus === "boolean" ? params.allowPlus : true,
      allowPro: typeof params.allowPro === "boolean" ? params.allowPro : true,
      allowPremium: typeof params.allowPremium === "boolean" ? params.allowPremium : true,
    },
  });

  return mapFeatureRule(created);
}

export async function deleteFeatureAccessRule(featureId: number) {
  // Delete one feature rule by numeric id.
  const existing = await prisma.featureAccessRule.findUnique({
    where: { featureId },
    select: { featureId: true },
  });
  if (!existing) {
    return false;
  }

  await prisma.featureAccessRule.delete({
    where: { featureId },
  });
  return true;
}

function isSegmentAllowed(rule: FeatureAccessRuleRecord, segment: UserSegment) {
  // Resolve segment-specific toggle for one rule.
  if (segment === "Premium") {
    return rule.allowPremium;
  }
  if (segment === "Pro") {
    return rule.allowPro;
  }
  if (segment === "Plus") {
    return rule.allowPlus;
  }
  return rule.allowFree;
}

export async function checkUserFeatureAccess(user: UserRecord, featureKey: string) {
  // Evaluate whether a user can access the feature by segment and level.
  const rule = await readFeatureAccessRuleByKey(featureKey);
  if (!rule) {
    return {
      allowed: true,
      message: "",
      rule: null,
    };
  }

  if (!isSegmentAllowed(rule, user.segment)) {
    return {
      allowed: false,
      message: `${rule.featureName} is not available for ${user.segment} segment.`,
      rule,
    };
  }

  if (user.level < rule.minLevel) {
    return {
      allowed: false,
      message: `${rule.featureName} requires level ${rule.minLevel} or above.`,
      rule,
    };
  }

  return {
    allowed: true,
    message: "",
    rule,
  };
}
