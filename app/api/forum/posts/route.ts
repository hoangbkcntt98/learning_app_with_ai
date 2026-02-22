import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { createForumPost, listForumPosts, sanitizeForumPost } from "@/lib/forum";

type CreatePostBody = {
  subject?: string;
  description?: string;
};

const MAX_SUBJECT_LENGTH = 140;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function isSupportedImageType(mimeType: string) {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg" ||
    mimeType === "image/png" ||
    mimeType === "image/gif" ||
    mimeType === "image/webp"
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const posts = await listForumPosts(limit);

  return NextResponse.json({
    posts: posts.map(sanitizeForumPost),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let subject = "";
  let description = "";
  let imageBase64: string | null = null;
  let imageMimeType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    subject = String(formData.get("subject") ?? "").trim();
    description = String(formData.get("description") ?? "").trim();

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      if (image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "image is too large (max 5MB)." }, { status: 400 });
      }
      if (!isSupportedImageType(image.type)) {
        return NextResponse.json(
          { error: "Unsupported image type. Use JPG, PNG, GIF, or WEBP." },
          { status: 400 },
        );
      }
      const bytes = new Uint8Array(await image.arrayBuffer());
      imageBase64 = Buffer.from(bytes).toString("base64");
      imageMimeType = image.type;
    }
  } else {
    const body = (await request.json()) as CreatePostBody;
    subject = body.subject?.trim() ?? "";
    description = body.description?.trim() ?? "";
  }

  if (!subject) {
    return NextResponse.json({ error: "subject is required." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "description is required." }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return NextResponse.json(
      { error: `subject is too long (max ${MAX_SUBJECT_LENGTH} characters).` },
      { status: 400 },
    );
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `description is too long (max ${MAX_DESCRIPTION_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const post = await createForumPost({
    userEmail: user.email,
    subject,
    description,
    imageBase64,
    imageMimeType,
  });

  return NextResponse.json({ post: sanitizeForumPost(post) }, { status: 201 });
}
