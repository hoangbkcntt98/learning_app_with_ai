import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  // Update one store product from admin edit popup.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId) || productId < 1) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
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

  const productType = typeof body.productType === "number" ? Math.trunc(body.productType) : NaN;
  const useType = typeof body.useType === "number" ? Math.trunc(body.useType) : NaN;
  const name = body.name?.trim() ?? "";
  const description = body.description?.trim() ?? "";
  const imageUrl = body.imageUrl?.trim() ?? "";
  const priceGold = typeof body.priceGold === "number" ? Math.trunc(body.priceGold) : NaN;
  const durationDays = typeof body.durationDays === "number" ? Math.trunc(body.durationDays) : NaN;
  const effectExtraAiDailyQuota =
    typeof body.effectExtraAiDailyQuota === "number" ? Math.trunc(body.effectExtraAiDailyQuota) : NaN;
  const effectBonusPoints =
    typeof body.effectBonusPoints === "number" ? Math.trunc(body.effectBonusPoints) : NaN;
  const effectBonusGold =
    typeof body.effectBonusGold === "number" ? Math.trunc(body.effectBonusGold) : NaN;
  const isActive = body.isActive === true;

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
    const updated = await prisma.storeProduct.update({
      where: { id: productId },
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
    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  // Delete one store product from admin table action.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const { id } = await context.params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId) || productId < 1) {
    return NextResponse.json({ error: "Invalid product id." }, { status: 400 });
  }

  try {
    await prisma.storeProduct.delete({
      where: { id: productId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product." }, { status: 500 });
  }
}
