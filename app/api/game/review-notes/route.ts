import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { hasQuestionInUserList, isUserQuestionListType } from "@/lib/question-lists";
import { getUserQuestionNote, upsertUserQuestionNote } from "@/lib/question-notes";
import { getCurrentUser } from "@/lib/session";

function parseQuestionId(value: unknown) {
  // Normalize question id input from either query string or JSON payload.
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
}

export async function GET(request: Request) {
  // Return current user's note for a review-list question.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "review");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = parseQuestionId(searchParams.get("questionId"));
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  const listTypeRaw = String(searchParams.get("type") ?? "review")
    .trim()
    .toLowerCase();
  if (!isUserQuestionListType(listTypeRaw)) {
    return NextResponse.json({ error: "type must be incorrect or review." }, { status: 400 });
  }

  const canAccess = await hasQuestionInUserList(user.email, questionId, listTypeRaw);
  if (!canAccess) {
    return NextResponse.json({ error: "Question is not in your selected list." }, { status: 403 });
  }

  const note = await getUserQuestionNote(user.email, questionId);
  return NextResponse.json({ note });
}

export async function PUT(request: Request) {
  // Save note for current user's review-list question.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "review");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const body = (await request.json()) as {
    questionId?: number;
    note?: string;
    type?: string;
  };
  const questionId = parseQuestionId(body.questionId);
  if (!questionId) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  const listTypeRaw = String(body.type ?? "review").trim().toLowerCase();
  if (!isUserQuestionListType(listTypeRaw)) {
    return NextResponse.json({ error: "type must be incorrect or review." }, { status: 400 });
  }

  const canAccess = await hasQuestionInUserList(user.email, questionId, listTypeRaw);
  if (!canAccess) {
    return NextResponse.json({ error: "Question is not in your selected list." }, { status: 403 });
  }

  const note = String(body.note ?? "").slice(0, 2000);
  await upsertUserQuestionNote(user.email, questionId, note);
  return NextResponse.json({ ok: true });
}
