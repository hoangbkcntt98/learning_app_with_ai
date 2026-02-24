import { NextResponse } from "next/server";
import { canUseAiModel } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const quota = await canUseAiModel(user.email);
  return NextResponse.json({
    allowed: quota.allowed,
    used: quota.used,
    remaining: quota.remaining,
    limit: quota.limit,
    usageDate: quota.usageDate,
  });
}
