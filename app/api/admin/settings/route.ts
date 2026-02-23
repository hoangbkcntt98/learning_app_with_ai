import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { readAppSettings, updateAppSettings } from "@/lib/settings";

export async function GET() {
  // Return current configurable limits for admin settings screen.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const settings = await readAppSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  // Allow admins to update global app settings.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    maxRegisteredUsers?: number;
    aiChatAllowFree?: boolean;
    aiChatAllowPlus?: boolean;
    aiChatAllowPro?: boolean;
    aiChatAllowPremium?: boolean;
    forumMinLevel?: number;
  };

  if (
    body.forumMinLevel !== undefined &&
    (!Number.isFinite(body.forumMinLevel) || body.forumMinLevel < 0)
  ) {
    return NextResponse.json(
      { error: "forumMinLevel must be 0 or a positive number." },
      { status: 400 },
    );
  }
  if (
    body.maxRegisteredUsers !== undefined &&
    (!Number.isFinite(body.maxRegisteredUsers) || body.maxRegisteredUsers <= 0)
  ) {
    return NextResponse.json(
      { error: "maxRegisteredUsers must be a positive number." },
      { status: 400 },
    );
  }

  const settings = await updateAppSettings({
    maxRegisteredUsers: body.maxRegisteredUsers,
    aiChatAllowFree: body.aiChatAllowFree,
    aiChatAllowPlus: body.aiChatAllowPlus,
    aiChatAllowPro: body.aiChatAllowPro,
    aiChatAllowPremium: body.aiChatAllowPremium,
    forumMinLevel: body.forumMinLevel,
  });
  return NextResponse.json({ settings });
}
