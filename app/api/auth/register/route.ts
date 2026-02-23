import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieName } from "@/lib/auth";
import { countUsers, createUser } from "@/lib/users";
import { readAppSettings } from "@/lib/settings";

const oneWeekSeconds = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  // Enforce registration cap configured by admin settings.
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
    const settings = await readAppSettings();
    const totalUsers = await countUsers();
    if (totalUsers >= settings.maxRegisteredUsers) {
      return NextResponse.json(
        { error: "Registration is closed because maximum users has been reached." },
        { status: 403 },
      );
    }

    const user = await createUser({ email, password, name });
    const session = createSessionToken(user.email);

    const response = NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        points: user.points,
        gold: user.gold,
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
  } catch (error) {
    // Keep duplicate-account responses user-friendly; surface other failures.
    if (error instanceof Error && error.message === "User already exists") {
      return NextResponse.json({ error: "User already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create account." }, { status: 500 });
  }
}
