import { NextResponse } from "next/server";
import { checkUserFeatureAccess, getFeatureKeyFromRoutePath } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = String(searchParams.get("path") ?? "").trim();
  const featureKey = getFeatureKeyFromRoutePath(path);
  if (!featureKey) {
    return NextResponse.json({ allowed: true, message: "" });
  }

  const access = await checkUserFeatureAccess(user, featureKey);
  return NextResponse.json({
    allowed: access.allowed,
    message: access.message,
    featureKey,
  });
}

