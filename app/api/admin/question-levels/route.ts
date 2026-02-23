import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { findQuestionFieldById } from "@/lib/question-fields";
import { createQuestionLevel, readQuestionLevels } from "@/lib/question-levels";

export async function GET(request: Request) {
  // Return question levels for admin, optionally filtered by question field.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fieldIdRaw = searchParams.get("fieldId");
  const fieldId = fieldIdRaw ? Number.parseInt(fieldIdRaw, 10) : undefined;
  if (fieldIdRaw && (!Number.isFinite(fieldId) || (fieldId ?? 0) < 1)) {
    return NextResponse.json({ error: "Invalid fieldId." }, { status: 400 });
  }

  const levels = await readQuestionLevels(fieldId);
  return NextResponse.json({ levels });
}

export async function POST(request: Request) {
  // Create one managed level under a specific question field.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    questionFieldId?: number;
    name?: string;
  };

  const questionFieldId =
    typeof body.questionFieldId === "number" ? Math.trunc(body.questionFieldId) : 0;
  const name = String(body.name ?? "").trim();
  if (questionFieldId < 1 || !name) {
    return NextResponse.json(
      { error: "questionFieldId and name are required." },
      { status: 400 },
    );
  }

  const field = await findQuestionFieldById(questionFieldId);
  if (!field) {
    return NextResponse.json({ error: "Question field not found." }, { status: 400 });
  }

  try {
    const level = await createQuestionLevel({ questionFieldId, name });
    return NextResponse.json({ level }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create level. Duplicate level name in this field." },
      { status: 409 },
    );
  }
}
