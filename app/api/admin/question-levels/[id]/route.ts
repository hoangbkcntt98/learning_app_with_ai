import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { findQuestionFieldById } from "@/lib/question-fields";
import { deleteQuestionLevelById, updateQuestionLevel } from "@/lib/question-levels";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  // Update one managed question level.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid level id." }, { status: 400 });
  }

  const body = (await request.json()) as {
    questionFieldId?: number;
    name?: string;
  };

  const questionFieldId =
    typeof body.questionFieldId === "number" ? Math.trunc(body.questionFieldId) : undefined;
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
  }
  if (questionFieldId !== undefined && questionFieldId < 1) {
    return NextResponse.json({ error: "Invalid questionFieldId." }, { status: 400 });
  }
  if (questionFieldId !== undefined) {
    const field = await findQuestionFieldById(questionFieldId);
    if (!field) {
      return NextResponse.json({ error: "Question field not found." }, { status: 400 });
    }
  }

  try {
    const updated = await updateQuestionLevel({
      id: Math.trunc(id),
      questionFieldId,
      name,
    });
    if (!updated) {
      return NextResponse.json({ error: "Level not found." }, { status: 404 });
    }
    return NextResponse.json({ level: updated });
  } catch {
    return NextResponse.json(
      { error: "Failed to update level. Duplicate level name in this field." },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  // Delete one managed question level when not used by questions.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid level id." }, { status: 400 });
  }

  const result = await deleteQuestionLevelById(Math.trunc(id));
  if (!result.ok) {
    if (result.reason === "in_use") {
      return NextResponse.json({ error: "Level is used by existing questions." }, { status: 400 });
    }
    return NextResponse.json({ error: "Level not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
