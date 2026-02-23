import { NextResponse } from "next/server";
import {
  deleteQuestionByAdmin,
  sanitizeQuestionForAdmin,
  findQuestionById,
  updateQuestion,
} from "@/lib/questions";
import { findQuestionFieldById } from "@/lib/question-fields";
import { hasQuestionLevelInField } from "@/lib/question-levels";
import { getCurrentAdminUser } from "@/lib/session";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  const body = (await request.json()) as {
    fieldId?: number;
    level?: string;
    prompt?: string;
    options?: string[];
    correctIndex?: number;
  };

  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
  }

  if (body.level !== undefined && !String(body.level).trim()) {
    return NextResponse.json({ error: "level cannot be empty." }, { status: 400 });
  }

  if (body.fieldId !== undefined) {
    if (!Number.isFinite(body.fieldId) || Math.trunc(body.fieldId) < 1) {
      return NextResponse.json({ error: "Invalid question field id." }, { status: 400 });
    }
    const field = await findQuestionFieldById(Math.trunc(body.fieldId));
    if (!field) {
      return NextResponse.json({ error: "Question field not found." }, { status: 400 });
    }
  }
  const current = await findQuestionById(Math.trunc(id));
  if (!current) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  const nextFieldId =
    typeof body.fieldId === "number" ? Math.trunc(body.fieldId) : current.fieldId;
  const nextLevel = body.level?.trim() ?? current.level;
  const hasLevel = await hasQuestionLevelInField(nextFieldId, nextLevel);
  if (!hasLevel) {
    return NextResponse.json(
      { error: "Selected level is not configured for this question field." },
      { status: 400 },
    );
  }

  if (
    body.correctIndex !== undefined &&
    (typeof body.correctIndex !== "number" || body.correctIndex < 0 || body.correctIndex > 3)
  ) {
    return NextResponse.json({ error: "correctIndex must be 0..3." }, { status: 400 });
  }

  if (body.options && (!Array.isArray(body.options) || body.options.length !== 4)) {
    return NextResponse.json(
      { error: "options must contain exactly 4 items." },
      { status: 400 },
    );
  }

  const updated = await updateQuestion({
    id: Math.trunc(id),
    fieldId: nextFieldId,
    level: body.level?.trim(),
    prompt: body.prompt?.trim(),
    options: body.options
      ? [
          body.options[0]?.trim() ?? "",
          body.options[1]?.trim() ?? "",
          body.options[2]?.trim() ?? "",
          body.options[3]?.trim() ?? "",
        ]
      : undefined,
    correctIndex: body.correctIndex,
  });

  if (!updated) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ question: sanitizeQuestionForAdmin(updated) });
}

export async function DELETE(_request: Request, context: Context) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
  }

  const deleted = await deleteQuestionByAdmin(Math.trunc(id));
  if (!deleted) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
