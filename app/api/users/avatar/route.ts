import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { sanitizeUser, updateUserAvatar } from "@/lib/users";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function isSupportedImageType(mimeType: string) {
  // Restrict avatar uploads to safe image types used across the app.
  return (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  );
}

export async function POST(request: Request) {
  // Upload and set current user's avatar image.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File) || avatar.size <= 0) {
    return NextResponse.json({ error: "avatar file is required." }, { status: 400 });
  }
  if (avatar.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "avatar is too large (max 2MB)." }, { status: 400 });
  }
  if (!isSupportedImageType(avatar.type)) {
    return NextResponse.json(
      { error: "Unsupported avatar type. Use JPG, PNG, GIF, or WEBP." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await avatar.arrayBuffer());
  const dataUrl = `data:${avatar.type};base64,${bytes.toString("base64")}`;
  const updated = await updateUserAvatar(user.email, dataUrl);
  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: sanitizeUser(updated) });
}
