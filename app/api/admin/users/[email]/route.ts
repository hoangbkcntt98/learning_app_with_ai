import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import {
  type UserSegment,
  deleteUserByAdmin,
  isUserSegment,
  sanitizeUser,
  updateUserByAdmin,
} from "@/lib/users";

type Context = {
  params: Promise<{ email: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const email = decodeURIComponent(params.email);
  const body = (await request.json()) as {
    name?: string;
    segment?: string;
    points?: number;
    level?: number;
    role?: "admin" | "user";
    password?: string;
    aiDailyQuota?: number;
  };

  if (typeof body.points === "number" && !Number.isFinite(body.points)) {
    return NextResponse.json({ error: "points must be a number." }, { status: 400 });
  }
  if (typeof body.level === "number" && (!Number.isFinite(body.level) || body.level < 0)) {
    return NextResponse.json({ error: "level must be 0 or a positive number." }, { status: 400 });
  }
  if (typeof body.segment === "string" && !isUserSegment(body.segment.trim())) {
    return NextResponse.json({ error: "Invalid segment." }, { status: 400 });
  }

  if (body.role && body.role !== "admin" && body.role !== "user") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  if (body.password && body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (
    typeof body.aiDailyQuota === "number" &&
    (!Number.isFinite(body.aiDailyQuota) || body.aiDailyQuota <= 0)
  ) {
    return NextResponse.json(
      { error: "aiDailyQuota must be a positive number." },
      { status: 400 },
    );
  }
  const segment: UserSegment | undefined =
    typeof body.segment === "string" && isUserSegment(body.segment.trim())
      ? (body.segment.trim() as UserSegment)
      : undefined;

  const user = await updateUserByAdmin({
    email,
    name: body.name,
    segment,
    points: body.points,
    level: body.level,
    role: body.role,
    password: body.password,
    aiDailyQuota: body.aiDailyQuota,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: sanitizeUser(user) });
}

export async function DELETE(_request: Request, context: Context) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const email = decodeURIComponent(params.email);
  if (admin.email.toLowerCase() === email.trim().toLowerCase()) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  const deleted = await deleteUserByAdmin(email);
  if (!deleted) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
