import { NextResponse } from "next/server";
import { countUsers, createUserByAdmin, readUsers, sanitizeUser } from "@/lib/users";
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
    password?: string;
    role?: "admin" | "user";
    points?: number;
    aiDailyQuota?: number;
  };

  const email = body.email?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : "user";
  const points = typeof body.points === "number" ? body.points : 0;
  const aiDailyQuota =
    typeof body.aiDailyQuota === "number" ? body.aiDailyQuota : undefined;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "email, name and password are required." },
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
      password,
      role,
      points,
      aiDailyQuota,
    });
    return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
  } catch (error) {
    // Preserve duplicate-user semantics while not masking other server errors.
    if (error instanceof Error && error.message === "User already exists") {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
