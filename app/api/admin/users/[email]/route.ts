import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { sanitizeUser, updateUserByAdmin } from "@/lib/users";

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
    points?: number;
    role?: "admin" | "user";
    password?: string;
  };

  if (typeof body.points === "number" && !Number.isFinite(body.points)) {
    return NextResponse.json({ error: "points must be a number." }, { status: 400 });
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

  const user = await updateUserByAdmin({
    email,
    name: body.name,
    points: body.points,
    role: body.role,
    password: body.password,
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: sanitizeUser(user) });
}
