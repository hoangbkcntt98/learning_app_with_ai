import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import {
  createFeatureAccessRule,
  deleteFeatureAccessRule,
  readFeatureAccessRules,
  updateFeatureAccessRule,
} from "@/lib/feature-access";

export async function GET() {
  // Return feature restriction rows for admin dropdown management.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const features = await readFeatureAccessRules();
  return NextResponse.json({ features });
}

export async function PATCH(request: Request) {
  // Update restrictions for one feature selected by admin.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    featureId?: number;
    featureKey?: string;
    featureName?: string;
    routePath?: string;
    minLevel?: number;
    allowFree?: boolean;
    allowPlus?: boolean;
    allowPro?: boolean;
    allowPremium?: boolean;
  };

  if (typeof body.featureId !== "number" || !Number.isFinite(body.featureId)) {
    return NextResponse.json({ error: "featureId is required." }, { status: 400 });
  }
  if (body.minLevel !== undefined && (!Number.isFinite(body.minLevel) || body.minLevel < 0)) {
    return NextResponse.json({ error: "minLevel must be 0 or a positive number." }, { status: 400 });
  }
  if (typeof body.routePath === "string" && body.routePath.trim() && !body.routePath.trim().startsWith("/")) {
    return NextResponse.json({ error: "routePath must start with '/'." }, { status: 400 });
  }

  let updated;
  try {
    updated = await updateFeatureAccessRule({
      featureId: Math.trunc(body.featureId),
      featureKey: body.featureKey,
      featureName: body.featureName,
      routePath: body.routePath,
      minLevel: body.minLevel,
      allowFree: body.allowFree,
      allowPlus: body.allowPlus,
      allowPro: body.allowPro,
      allowPremium: body.allowPremium,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update feature. featureKey may already exist." }, { status: 409 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Feature not found." }, { status: 404 });
  }

  return NextResponse.json({ feature: updated });
}

export async function POST(request: Request) {
  // Create a new feature with its restriction rule values.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    featureKey?: string;
    featureName?: string;
    routePath?: string;
    minLevel?: number;
    allowFree?: boolean;
    allowPlus?: boolean;
    allowPro?: boolean;
    allowPremium?: boolean;
  };

  const featureKey = String(body.featureKey ?? "").trim();
  const featureName = String(body.featureName ?? "").trim();
  const routePath = String(body.routePath ?? "").trim();
  if (!featureKey || !featureName || !routePath) {
    return NextResponse.json(
      { error: "featureKey, featureName, and routePath are required." },
      { status: 400 },
    );
  }
  if (!routePath.startsWith("/")) {
    return NextResponse.json({ error: "routePath must start with '/'." }, { status: 400 });
  }
  if (body.minLevel !== undefined && (!Number.isFinite(body.minLevel) || body.minLevel < 0)) {
    return NextResponse.json({ error: "minLevel must be 0 or a positive number." }, { status: 400 });
  }

  try {
    const created = await createFeatureAccessRule({
      featureKey,
      featureName,
      routePath,
      minLevel: body.minLevel,
      allowFree: body.allowFree,
      allowPlus: body.allowPlus,
      allowPro: body.allowPro,
      allowPremium: body.allowPremium,
    });
    return NextResponse.json({ feature: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create feature. featureKey may already exist." }, { status: 409 });
  }
}

export async function DELETE(request: Request) {
  // Remove one feature and its associated access rule.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as { featureId?: number };
  if (typeof body.featureId !== "number" || !Number.isFinite(body.featureId)) {
    return NextResponse.json({ error: "featureId is required." }, { status: 400 });
  }

  const deleted = await deleteFeatureAccessRule(Math.trunc(body.featureId));
  if (!deleted) {
    return NextResponse.json({ error: "Feature not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
