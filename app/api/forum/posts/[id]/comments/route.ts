import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import { createForumComment, sanitizeForumComment } from "@/lib/forum";

type CreateCommentBody = {
  content?: string;
};

const MAX_COMMENT_LENGTH = 1000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "forum");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const { id } = await context.params;
  const postId = Number.parseInt(id, 10);
  if (!Number.isFinite(postId) || postId <= 0) {
    return NextResponse.json({ error: "Invalid post id." }, { status: 400 });
  }

  const body = (await request.json()) as CreateCommentBody;
  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `content is too long (max ${MAX_COMMENT_LENGTH} characters).` },
      { status: 400 },
    );
  }

  try {
    const comment = await createForumComment({
      postId,
      userEmail: user.email,
      content,
    });
    return NextResponse.json({ comment: sanitizeForumComment(comment) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
}
