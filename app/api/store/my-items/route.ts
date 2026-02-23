import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listUserStoreItems, userHasAnyActiveStoreItem } from "@/lib/store";

export async function GET() {
  // Return user's active purchased items for equip popup.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [items, hasItems] = await Promise.all([
    listUserStoreItems(user.email),
    userHasAnyActiveStoreItem(user.email),
  ]);

  return NextResponse.json({
    items,
    hasItems,
  });
}
