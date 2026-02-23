import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listStoreProducts, listUserStoreItems } from "@/lib/store";

export async function GET() {
  // Return available store products for logged-in users.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [products, userItems] = await Promise.all([
    listStoreProducts(),
    listUserStoreItems(user.email),
  ]);
  const ownedProductIds = Array.from(new Set(userItems.map((item) => item.productId)));
  return NextResponse.json({
    products,
    userGold: user.gold,
    ownedProductIds,
  });
}
