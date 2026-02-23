import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { createQuestionReport } from "@/lib/question-reports";
import { findQuestionById } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

export async function POST(request: Request) {
  // Allow learners to submit question reports with free text.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "learning");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const body = (await request.json()) as {
    questionId?: number;
    content?: string;
  };
  const questionId = typeof body.questionId === "number" ? Math.trunc(body.questionId) : 0;
  const content = String(body.content ?? "").trim();

  if (!Number.isFinite(questionId) || questionId < 1 || !content) {
    return NextResponse.json(
      { error: "questionId and report content are required." },
      { status: 400 },
    );
  }
  if (content.length > 1000) {
    return NextResponse.json({ error: "Report content is too long (max 1000)." }, { status: 400 });
  }

  const question = await findQuestionById(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  const accessibleFieldIds = new Set(await getUserAccessibleQuestionFieldIds(user.email));
  if (!accessibleFieldIds.has(question.fieldId)) {
    return NextResponse.json({ error: "Question is not accessible for your account." }, { status: 403 });
  }

  const report = await createQuestionReport({
    userEmail: user.email,
    questionId: question.id,
    content,
  });
  return NextResponse.json({ report }, { status: 201 });
}
