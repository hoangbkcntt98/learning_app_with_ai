import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { updateAllUsersAiDailyQuota } from "@/lib/users";

export async function PATCH(request: Request) {
  // Bulk-apply the same daily AI quota to all existing users.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    aiDailyQuota?: number;
  };
  const aiDailyQuota =
    typeof body.aiDailyQuota === "number" ? Math.trunc(body.aiDailyQuota) : Number.NaN;

  if (!Number.isFinite(aiDailyQuota) || aiDailyQuota <= 0) {
    return NextResponse.json(
      { error: "aiDailyQuota must be a positive number." },
      { status: 400 },
    );
  }

  const result = await updateAllUsersAiDailyQuota(aiDailyQuota);
  return NextResponse.json({
    updatedUsers: result.count,
    aiDailyQuota,
  });
}
