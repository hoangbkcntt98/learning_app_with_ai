import { NextResponse } from "next/server";
import {
  deleteQuestionByAdmin,
  type JlptLevel,
  isJlptLevel,
  sanitizeQuestionForAdmin,
  updateQuestion,
} from "@/lib/questions";
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
    level?: string;
    prompt?: string;
    options?: string[];
    correctIndex?: number;
  };

  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
  }

  if (body.level && !isJlptLevel(body.level)) {
    return NextResponse.json({ error: "Invalid JLPT level." }, { status: 400 });
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

  const nextLevel: JlptLevel | undefined = body.level
    ? (body.level as JlptLevel)
    : undefined;

  const updated = await updateQuestion({
    id: Math.trunc(id),
    level: nextLevel,
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
