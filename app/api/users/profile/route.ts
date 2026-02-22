import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { sanitizeUser, updateUserProfile } from "@/lib/users";

export async function PATCH(request: Request) {
  // Update current user's profile fields (for now: name).
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
  };

  if (typeof body.name === "string" && body.name.trim().length === 0) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }

  const updated = await updateUserProfile({
    email: user.email,
    name: body.name,
  });
  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: sanitizeUser(updated) });
}
