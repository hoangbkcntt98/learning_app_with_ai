import { NextResponse } from "next/server";
import {
  countUsers,
  createUserByAdmin,
  isUserSegment,
  readUsers,
  sanitizeUser,
} from "@/lib/users";
import { getCurrentAdminUser } from "@/lib/session";
import { readAppSettings } from "@/lib/settings";

export async function GET() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const users = await readUsers();
  return NextResponse.json({ users: users.map(sanitizeUser) });
}

export async function POST(request: Request) {
  // Respect the global max user cap even for admin-created accounts.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    segment?: string;
    password?: string;
    role?: "admin" | "user";
    points?: number;
    gold?: number;
    aiDailyQuota?: number;
    questionFieldIds?: number[];
  };

  const email = body.email?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const segment = String(body.segment ?? "Free").trim();
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : "user";
  const points = typeof body.points === "number" ? body.points : 0;
  const gold = typeof body.gold === "number" ? body.gold : 0;
  const aiDailyQuota =
    typeof body.aiDailyQuota === "number" ? body.aiDailyQuota : undefined;
  const questionFieldIds = Array.isArray(body.questionFieldIds)
    ? body.questionFieldIds
        .map((item) => (Number.isFinite(item) ? Math.trunc(item) : NaN))
        .filter((item) => Number.isFinite(item) && item > 0)
    : undefined;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "email, name and password are required." },
      { status: 400 },
    );
  }
  if (!isUserSegment(segment)) {
    return NextResponse.json({ error: "segment must be Free, Plus, Pro, or Premium." }, { status: 400 });
  }
  if (typeof gold === "number" && (!Number.isFinite(gold) || gold < 0)) {
    return NextResponse.json(
      { error: "gold must be a non-negative number." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (typeof aiDailyQuota === "number" && (!Number.isFinite(aiDailyQuota) || aiDailyQuota <= 0)) {
    return NextResponse.json(
      { error: "aiDailyQuota must be a positive number." },
      { status: 400 },
    );
  }
  if (Array.isArray(questionFieldIds) && questionFieldIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one question field." },
      { status: 400 },
    );
  }

  try {
    const settings = await readAppSettings();
    const totalUsers = await countUsers();
    if (totalUsers >= settings.maxRegisteredUsers) {
      return NextResponse.json(
        { error: "Cannot create user because maximum users has been reached." },
        { status: 403 },
      );
    }

    const user = await createUserByAdmin({
      email,
      name,
      segment,
      password,
      role,
      points,
      gold,
      aiDailyQuota,
      questionFieldIds,
    });
    return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
  } catch (error) {
    // Preserve duplicate-user semantics while not masking other server errors.
    if (error instanceof Error && error.message === "User already exists") {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "At least one question field is required") {
      return NextResponse.json({ error: "Select at least one question field." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
