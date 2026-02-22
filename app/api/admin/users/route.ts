import { NextResponse } from "next/server";
import { createUserByAdmin, readUsers, sanitizeUser } from "@/lib/users";
import { getCurrentAdminUser } from "@/lib/session";

export async function GET() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const users = await readUsers();
  return NextResponse.json({ users: users.map(sanitizeUser) });
}

export async function POST(request: Request) {
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
  };

  const email = body.email?.trim() ?? "";
  const name = body.name?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : "user";
  const points = typeof body.points === "number" ? body.points : 0;

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

  try {
    const user = await createUserByAdmin({ email, name, password, role, points });
    return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "User already exists." }, { status: 409 });
  }
}
