import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  // Keep seeded users aligned with the same default quota used by runtime.
  const defaultAiDailyQuota =
    Number.parseInt(process.env.DEFAULT_AI_DAILY_QUOTA_PER_USER ?? "20", 10) > 0
      ? Number.parseInt(process.env.DEFAULT_AI_DAILY_QUOTA_PER_USER ?? "20", 10)
      : 20;
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
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          name: seed.name,
          role: seed.role,
          aiDailyQuota: defaultAiDailyQuota,
        },
      });
      continue;
    }

    const points = seed.points;
    await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(seed.password),
        name: seed.name,
        points,
        level: calculateLevelFromPoints(points),
        role: seed.role,
        aiDailyQuota: defaultAiDailyQuota,
      },
    });
    createdCount += 1;
  }

  const allUsers = await prisma.user.findMany({
    select: { email: true, points: true },
  });
  for (const row of allUsers) {
    const points = Number(row.points) || 0;
    await prisma.user.update({
      where: { email: row.email },
      data: { level: calculateLevelFromPoints(points) },
    });
  }

  console.log(`Seeding complete. Added ${createdCount} user(s).`);
}

main()
  .catch((error) => {
    console.error("Failed to seed users:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
