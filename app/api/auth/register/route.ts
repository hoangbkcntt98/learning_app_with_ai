import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "@/lib/auth";
import { createUser } from "@/lib/users";

const oneWeekSeconds = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";
  const name = body.name?.trim() ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
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
    const user = await createUser({ email, password, name });
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
  } catch {
    return NextResponse.json({ error: "User already exists." }, { status: 409 });
  }
}
