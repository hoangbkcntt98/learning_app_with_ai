import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type StoreProductRecord = {
  id: number;
  productType: number;
  useType: 0 | 1;
  name: string;
  description: string;
  imageUrl: string;
  priceGold: number;
  stockLimit: number | null;
  soldCount: number;
  durationDays: number;
  effectExtraAiDailyQuota: number;
  effectBonusPoints: number;
  effectBonusGold: number;
  isActive: boolean;
};

export type UserStoreItemRecord = {
  id: string;
  userEmail: string;
  productId: number;
  purchasedAt: string;
  expiresAt: string;
  isEquipped: boolean;
  product: StoreProductRecord;
};

const defaultProducts = [
  {
    productType: 1,
    useType: 1,
    name: "Happy Capybara",
    description: "Allows the user to ask the AI 3 extra times if they exceed their quota.",
    imageUrl: "/images/products/pet_bonous_ai.png",
    priceGold: 3,
    stockLimit: null,
    durationDays: 0,
    effectExtraAiDailyQuota: 3,
    effectBonusPoints: 0,
    effectBonusGold: 0,
  },
  {
    productType: 1,
    useType: 0,
    name: "Rickid Capybara",
    description: "Increases +5 points and +1 gold for each correct answer.",
    imageUrl: "/images/products/pet_bonous_point.png",
    priceGold: 30,
    stockLimit: null,
    durationDays: 1,
    effectExtraAiDailyQuota: 0,
    effectBonusPoints: 5,
    effectBonusGold: 1,
  },
  {
    productType: 1,
    useType: 0,
    name: "Bosss Capybara",
    description: "Increases +10 points and +5 gold for each correct answer.",
    imageUrl: "/images/products/pet_bonous_point_1.png",
    priceGold: 300,
    stockLimit: null,
    durationDays: 3,
    effectExtraAiDailyQuota: 0,
    effectBonusPoints: 10,
    effectBonusGold: 5,
  },
] as const;

function mapProduct(product: {
  id: number;
  productType: number;
  useType: number;
  name: string;
  description: string;
  imageUrl: string;
  priceGold: number;
  stockLimit: number | null;
  soldCount: number;
  durationDays: number;
  effectExtraAiDailyQuota: number;
  effectBonusPoints: number;
  effectBonusGold: number;
  isActive: boolean;
}): StoreProductRecord {
  // Normalize store product row into app-level record.
  return {
    id: product.id,
    productType: product.productType,
    useType: product.useType === 1 ? 1 : 0,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    priceGold: product.priceGold,
    stockLimit:
      typeof product.stockLimit === "number" && Number.isFinite(product.stockLimit)
        ? Math.max(0, Math.trunc(product.stockLimit))
        : null,
    soldCount:
      typeof product.soldCount === "number" && Number.isFinite(product.soldCount)
        ? Math.max(0, Math.trunc(product.soldCount))
        : 0,
    durationDays: product.durationDays,
    effectExtraAiDailyQuota: product.effectExtraAiDailyQuota,
    effectBonusPoints: product.effectBonusPoints,
    effectBonusGold: product.effectBonusGold,
    isActive: product.isActive,
  };
}

function mapUserStoreItem(item: {
  id: bigint;
  userEmail: string;
  productId: number;
  purchasedAt: Date;
  expiresAt: Date;
  isEquipped: boolean;
    product: {
      id: number;
      productType: number;
      useType: number;
      name: string;
      description: string;
      imageUrl: string;
      priceGold: number;
      stockLimit: number | null;
      soldCount: number;
      durationDays: number;
      effectExtraAiDailyQuota: number;
      effectBonusPoints: number;
      effectBonusGold: number;
      isActive: boolean;
  };
}): UserStoreItemRecord {
  // Normalize purchased item row for JSON-safe API responses.
  return {
    id: item.id.toString(),
    userEmail: item.userEmail,
    productId: item.productId,
    purchasedAt: item.purchasedAt.toISOString(),
    expiresAt: item.expiresAt.toISOString(),
    isEquipped: item.isEquipped,
    product: mapProduct(item.product),
  };
}

export async function ensureStoreProducts(db: DbClient = prisma) {
  // Seed default store products if they do not exist.
  for (const product of defaultProducts) {
    await db.storeProduct.upsert({
      where: { name: product.name },
      create: {
        productType: product.productType,
        useType: product.useType,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        priceGold: product.priceGold,
        stockLimit: product.stockLimit,
        durationDays: product.durationDays,
        effectExtraAiDailyQuota: product.effectExtraAiDailyQuota,
        effectBonusPoints: product.effectBonusPoints,
        effectBonusGold: product.effectBonusGold,
        isActive: true,
      },
      update: {
        productType: product.productType,
        useType: product.useType,
        description: product.description,
        imageUrl: product.imageUrl,
        priceGold: product.priceGold,
        stockLimit: product.stockLimit,
        durationDays: product.durationDays,
        effectExtraAiDailyQuota: product.effectExtraAiDailyQuota,
        effectBonusPoints: product.effectBonusPoints,
        effectBonusGold: product.effectBonusGold,
        isActive: true,
      },
    });
  }
}

export async function listStoreProducts() {
  // Return active store products ordered by price.
  await ensureStoreProducts();
  const products = await prisma.storeProduct.findMany({
    where: { isActive: true },
    orderBy: [{ priceGold: "asc" }, { id: "asc" }],
  });
  return products.map(mapProduct);
}

export async function cleanupExpiredUserStoreItems(userEmail: string, db: DbClient = prisma) {
  // Remove expired purchased items before listing/equip/effect checks.
  await db.userStoreItem.deleteMany({
    where: {
      userEmail,
      expiresAt: {
        lte: new Date(),
      },
    },
  });
}

export async function listUserStoreItems(userEmail: string) {
  // Return user's non-expired purchased items including product data.
  await ensureStoreProducts();
  await cleanupExpiredUserStoreItems(userEmail);
  const items = await prisma.userStoreItem.findMany({
    where: {
      userEmail,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      product: true,
    },
    orderBy: [{ isEquipped: "desc" }, { purchasedAt: "desc" }],
  });
  return items.map(mapUserStoreItem);
}

export async function userHasAnyActiveStoreItem(userEmail: string) {
  // Lightweight check for showing Pet/Equip button in summary card.
  await cleanupExpiredUserStoreItems(userEmail);
  const count = await prisma.userStoreItem.count({
    where: {
      userEmail,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
  return count > 0;
}

export async function buyStoreProduct(userEmail: string, productId: number) {
  // Purchase one product if user has enough gold and return updated user/item.
  await ensureStoreProducts();
  return prisma.$transaction(async (tx) => {
    await cleanupExpiredUserStoreItems(userEmail, tx);
    const product = await tx.storeProduct.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });
    if (!product) {
      throw new Error("Product not found.");
    }
    const alreadyOwned = await tx.userStoreItem.findFirst({
      where: {
        userEmail,
        productId: product.id,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });
    if (alreadyOwned) {
      throw new Error("Product already purchased.");
    }

    const user = await tx.user.findUnique({
      where: { email: userEmail },
      select: {
        email: true,
        gold: true,
      },
    });
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.gold < product.priceGold) {
      throw new Error("Not enough gold.");
    }
    if (typeof product.stockLimit === "number" && product.soldCount >= product.stockLimit) {
      throw new Error("Out of stock.");
    }

    const expiresAt =
      product.useType === 1
        ? new Date("2999-12-31T23:59:59.999Z")
        : new Date(Date.now() + product.durationDays * 24 * 60 * 60 * 1000);
    const shouldEquip = (await tx.userStoreItem.count({
      where: {
        userEmail,
        isEquipped: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    })) === 0;

    const [updatedUser, purchasedItem] = await Promise.all([
      tx.user.update({
        where: { email: userEmail },
        data: {
          gold: {
            decrement: product.priceGold,
          },
        },
        select: {
          email: true,
          gold: true,
        },
      }),
      tx.userStoreItem.create({
        data: {
          userEmail,
          productId: product.id,
          expiresAt,
          isEquipped: product.useType === 0 ? shouldEquip : false,
        },
        include: {
          product: true,
        },
      }),
    ]);
    if (typeof product.stockLimit === "number") {
      const increased = await tx.storeProduct.updateMany({
        where: {
          id: product.id,
          soldCount: {
            lt: product.stockLimit,
          },
        },
        data: {
          soldCount: {
            increment: 1,
          },
        },
      });
      if (increased.count === 0) {
        throw new Error("Out of stock.");
      }
    } else {
      await tx.storeProduct.update({
        where: { id: product.id },
        data: {
          soldCount: {
            increment: 1,
          },
        },
      });
    }

    return {
      userEmail: updatedUser.email,
      gold: updatedUser.gold,
      item: mapUserStoreItem(purchasedItem),
    };
  });
}

export async function activateUserStoreItem(userEmail: string, itemId: bigint) {
  // Use one purchased item: equip duration-based items, consume one-time items.
  await cleanupExpiredUserStoreItems(userEmail);
  return prisma.$transaction(async (tx) => {
    const target = await tx.userStoreItem.findFirst({
      where: {
        id: itemId,
        userEmail,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        product: true,
      },
    });
    if (!target) {
      throw new Error("Item not found.");
    }

    if (target.product.useType === 1) {
      await tx.user.update({
        where: { email: userEmail },
        data: {
          aiExtraUsageCredits: {
            increment: Math.max(0, target.product.effectExtraAiDailyQuota),
          },
        },
      });
      await tx.userStoreItem.delete({
        where: { id: target.id },
      });
      return {
        consumedOneTime: true,
      };
    }

    await tx.userStoreItem.update({
      where: { id: target.id },
      data: { isEquipped: true },
    });
    return {
      consumedOneTime: false,
    };
  });
}

export async function getUserActiveStoreEffects(
  userEmail: string,
  db: DbClient = prisma,
) {
  // Return summed effects from all equipped, non-expired duration-based items.
  await cleanupExpiredUserStoreItems(userEmail, db);
  const equippedItems = await db.userStoreItem.findMany({
    where: {
      userEmail,
      isEquipped: true,
      expiresAt: {
        gt: new Date(),
      },
      product: {
        useType: 0,
      },
    },
    include: {
      product: true,
    },
  });

  if (equippedItems.length === 0) {
    return {
      extraAiDailyQuota: 0,
      bonusPointsOnCorrect: 0,
      bonusGoldOnCorrect: 0,
    };
  }

  const total = equippedItems.reduce(
    (acc, item) => ({
      extraAiDailyQuota: acc.extraAiDailyQuota + Math.max(0, item.product.effectExtraAiDailyQuota),
      bonusPointsOnCorrect: acc.bonusPointsOnCorrect + Math.max(0, item.product.effectBonusPoints),
      bonusGoldOnCorrect: acc.bonusGoldOnCorrect + Math.max(0, item.product.effectBonusGold),
    }),
    {
      extraAiDailyQuota: 0,
      bonusPointsOnCorrect: 0,
      bonusGoldOnCorrect: 0,
    },
  );

  return {
    extraAiDailyQuota: total.extraAiDailyQuota,
    bonusPointsOnCorrect: total.bonusPointsOnCorrect,
    bonusGoldOnCorrect: total.bonusGoldOnCorrect,
  };
}
