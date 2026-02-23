import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { activateUserStoreItem, listUserStoreItems } from "@/lib/store";

export async function POST(request: Request) {
  // Use one purchased item.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    itemId?: string;
  };
  const rawItemId = String(body.itemId ?? "").trim();
  if (!rawItemId) {
    return NextResponse.json({ error: "itemId is required." }, { status: 400 });
  }

  let itemId: bigint;
  try {
    itemId = BigInt(rawItemId);
  } catch {
    return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
  }

  try {
    const used = await activateUserStoreItem(user.email, itemId);
    const items = await listUserStoreItems(user.email);
    return NextResponse.json({ items, consumedOneTime: used.consumedOneTime });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Equip failed.";
    if (message === "Item not found.") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Equip failed." }, { status: 500 });
  }
}
