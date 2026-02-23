import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { deleteQuestionFieldById, updateQuestionField } from "@/lib/question-fields";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  // Update one question field key/name/system prompt.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid field id." }, { status: 400 });
  }

  const body = (await request.json()) as {
    key?: string;
    name?: string;
    systemPrompt?: string;
    explanationPromptTemplate?: string;
  };
  if (
    (body.key !== undefined && !String(body.key).trim()) ||
    (body.name !== undefined && !String(body.name).trim())
  ) {
    return NextResponse.json({ error: "key/name cannot be empty." }, { status: 400 });
  }

  try {
    const updated = await updateQuestionField({
      id: Math.trunc(id),
      key: typeof body.key === "string" ? body.key.trim().toLowerCase() : undefined,
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      systemPrompt: typeof body.systemPrompt === "string" ? body.systemPrompt : undefined,
      explanationPromptTemplate:
        typeof body.explanationPromptTemplate === "string"
          ? body.explanationPromptTemplate
          : undefined,
    });
    if (!updated) {
      return NextResponse.json({ error: "Field not found." }, { status: 404 });
    }
    return NextResponse.json({ field: updated });
  } catch {
    return NextResponse.json({ error: "Failed to update field. key may already exist." }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: Context) {
  // Delete one question field if not protected.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const params = await context.params;
  const id = Number.parseInt(decodeURIComponent(params.id), 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Invalid field id." }, { status: 400 });
  }

  const result = await deleteQuestionFieldById(Math.trunc(id));
  if (!result.ok) {
    if (result.reason === "default") {
      return NextResponse.json({ error: "Default field cannot be deleted." }, { status: 400 });
    }
    return NextResponse.json({ error: "Field not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
