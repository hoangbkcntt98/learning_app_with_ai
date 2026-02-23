import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { applyGameAnswerResult } from "@/lib/users";
import { findQuestionById } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";
import { addQuestionToUserList } from "@/lib/question-lists";

export async function POST(request: Request) {
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
    selectedIndex?: number;
  };

  const questionId = body.questionId;
  const selectedIndex = body.selectedIndex;

  if (typeof questionId !== "number" || typeof selectedIndex !== "number") {
    return NextResponse.json(
      { error: "questionId and selectedIndex are required." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(questionId) || questionId < 1) {
    return NextResponse.json({ error: "Invalid questionId." }, { status: 400 });
  }

  if (selectedIndex < 0 || selectedIndex > 3) {
    return NextResponse.json({ error: "Invalid option index." }, { status: 400 });
  }

  const question = await findQuestionById(Math.trunc(questionId));
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const isCorrect = selectedIndex === question.correctIndex;
  const answerResult = await applyGameAnswerResult(user.email, isCorrect);

  if (!answerResult) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!isCorrect) {
    // Automatically track incorrect answers for later practice.
    await addQuestionToUserList(user.email, question.id, "incorrect");
  }

  return NextResponse.json({
    correct: isCorrect,
    correctIndex: question.correctIndex,
    points: answerResult.user.points,
    level: answerResult.user.level,
    delta: answerResult.delta,
    bonusPoints: answerResult.bonusPoints,
    streak: answerResult.streak,
  });
}
