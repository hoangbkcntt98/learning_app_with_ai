import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { buyStoreProduct } from "@/lib/store";

export async function POST(request: Request) {
  // Purchase one store product using user's current gold.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    productId?: number;
  };
  const productId = typeof body.productId === "number" ? Math.trunc(body.productId) : 0;
  if (!Number.isFinite(productId) || productId < 1) {
    return NextResponse.json({ error: "Invalid productId." }, { status: 400 });
  }

  try {
    const purchased = await buyStoreProduct(user.email, productId);
    return NextResponse.json({
      item: purchased.item,
      userGold: purchased.gold,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed.";
    if (message === "Product already purchased.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === "Not enough gold.") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "Out of stock.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === "Product not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Purchase failed." }, { status: 500 });
  }
}
