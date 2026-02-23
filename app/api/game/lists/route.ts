import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import {
  addQuestionToUserList,
  isUserQuestionListType,
  listQuestionsFromUserList,
  removeQuestionFromUserList,
} from "@/lib/question-lists";
import { findQuestionById } from "@/lib/questions";

async function ensureListAccess(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  listType: string,
) {
  // Restrict list operations by feature: review lists use Review, hidden list uses Learning.
  if (listType === "dont_show_again") {
    return checkUserFeatureAccess(user, "learning");
  }
  return checkUserFeatureAccess(user, "review");
}

export async function GET(request: Request) {
  // Return saved question list for current user.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const listTypeRaw = (searchParams.get("type") ?? "").trim().toLowerCase();
  if (!isUserQuestionListType(listTypeRaw)) {
    return NextResponse.json(
      { error: "type must be incorrect, review, or dont_show_again." },
      { status: 400 },
    );
  }

  const access = await ensureListAccess(user, listTypeRaw);
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const questions = await listQuestionsFromUserList(user.email, listTypeRaw);
  return NextResponse.json({ questions });
}

export async function POST(request: Request) {
  // Add a question into a saved list for current user.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    questionId?: number;
    type?: string;
  };

  if (typeof body.questionId !== "number" || !Number.isFinite(body.questionId)) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  const questionId = Math.trunc(body.questionId);
  if (questionId < 1) {
    return NextResponse.json({ error: "Invalid questionId." }, { status: 400 });
  }

  const listTypeRaw = String(body.type ?? "").trim().toLowerCase();
  if (!isUserQuestionListType(listTypeRaw)) {
    return NextResponse.json(
      { error: "type must be incorrect, review, or dont_show_again." },
      { status: 400 },
    );
  }

  const access = await ensureListAccess(user, listTypeRaw);
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const question = await findQuestionById(questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  await addQuestionToUserList(user.email, questionId, listTypeRaw);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  // Remove a question from one saved list for the current user.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    questionId?: number;
    type?: string;
  };

  if (typeof body.questionId !== "number" || !Number.isFinite(body.questionId)) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  const questionId = Math.trunc(body.questionId);
  if (questionId < 1) {
    return NextResponse.json({ error: "Invalid questionId." }, { status: 400 });
  }

  const listTypeRaw = String(body.type ?? "").trim().toLowerCase();
  if (!isUserQuestionListType(listTypeRaw)) {
    return NextResponse.json(
      { error: "type must be incorrect, review, or dont_show_again." },
      { status: 400 },
    );
  }

  const access = await ensureListAccess(user, listTypeRaw);
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  await removeQuestionFromUserList(user.email, questionId, listTypeRaw);
  return NextResponse.json({ ok: true });
}
