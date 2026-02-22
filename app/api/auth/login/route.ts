import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, verifyPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/users";

const oneWeekSeconds = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const session = createSessionToken(user.email);

  const response = NextResponse.json({
    user: {
      email: user.email,
      name: user.name,
      points: user.points,
      level: user.level,
      role: user.role,
    },
  });

  response.cookies.set({
    name: sessionCookieName,
    value: session,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: oneWeekSeconds,
  });

  return response;
}
