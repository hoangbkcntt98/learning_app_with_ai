import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Return all store products for admin management table.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const products = await prisma.storeProduct.findMany({
    orderBy: [{ id: "asc" }],
  });
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  // Create one store product from admin form input.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    productType?: number;
    useType?: number;
    name?: string;
    description?: string;
    imageUrl?: string;
    priceGold?: number;
    durationDays?: number;
    effectExtraAiDailyQuota?: number;
    effectBonusPoints?: number;
    effectBonusGold?: number;
    isActive?: boolean;
  };

  const productType = typeof body.productType === "number" ? Math.trunc(body.productType) : 0;
  const useType = typeof body.useType === "number" ? Math.trunc(body.useType) : 0;
  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";
  const priceGold = typeof body.priceGold === "number" ? Math.trunc(body.priceGold) : 0;
  const durationDays = typeof body.durationDays === "number" ? Math.trunc(body.durationDays) : 0;
  const effectExtraAiDailyQuota =
    typeof body.effectExtraAiDailyQuota === "number" ? Math.trunc(body.effectExtraAiDailyQuota) : 0;
  const effectBonusPoints =
    typeof body.effectBonusPoints === "number" ? Math.trunc(body.effectBonusPoints) : 0;
  const effectBonusGold =
    typeof body.effectBonusGold === "number" ? Math.trunc(body.effectBonusGold) : 0;
  const isActive = body.isActive !== false;

  if (!Number.isFinite(productType) || productType < 0) {
    return NextResponse.json({ error: "productType must be 0 or above." }, { status: 400 });
  }
  if (useType !== 0 && useType !== 1) {
    return NextResponse.json({ error: "useType must be 0 or 1." }, { status: 400 });
  }
  if (!name || !description || !imageUrl) {
    return NextResponse.json(
      { error: "name, description and imageUrl are required." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(priceGold) || priceGold < 0) {
    return NextResponse.json({ error: "priceGold must be 0 or above." }, { status: 400 });
  }
  if (!Number.isFinite(durationDays) || durationDays < 0) {
    return NextResponse.json({ error: "durationDays must be 0 or above." }, { status: 400 });
  }
  if (!Number.isFinite(effectExtraAiDailyQuota) || effectExtraAiDailyQuota < 0) {
    return NextResponse.json(
      { error: "effectExtraAiDailyQuota must be 0 or above." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(effectBonusPoints) || effectBonusPoints < 0) {
    return NextResponse.json({ error: "effectBonusPoints must be 0 or above." }, { status: 400 });
  }
  if (!Number.isFinite(effectBonusGold) || effectBonusGold < 0) {
    return NextResponse.json({ error: "effectBonusGold must be 0 or above." }, { status: 400 });
  }
  if (useType === 1 && durationDays !== 0) {
    return NextResponse.json(
      { error: "One-time-use product must have durationDays = 0." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.storeProduct.create({
      data: {
        productType,
        useType,
        name,
        description,
        imageUrl,
        priceGold,
        durationDays,
        effectExtraAiDailyQuota,
        effectBonusPoints,
        effectBonusGold,
        isActive,
      },
    });
    return NextResponse.json({ product: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
