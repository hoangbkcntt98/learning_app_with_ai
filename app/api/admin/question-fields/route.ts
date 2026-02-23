import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/session";
import { createQuestionField, readQuestionFields } from "@/lib/question-fields";

export async function GET() {
  // Return all question fields for admin dropdown/table usage.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const fields = await readQuestionFields();
  return NextResponse.json({ fields });
}

export async function POST(request: Request) {
  // Create one question field (e.g., JLPT, AWS, GCP).
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    key?: string;
    name?: string;
    systemPrompt?: string;
    explanationPromptTemplate?: string;
  };
  const key = String(body.key ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  const explanationPromptTemplate =
    typeof body.explanationPromptTemplate === "string"
      ? body.explanationPromptTemplate.trim()
      : "";

  if (!key || !name) {
    return NextResponse.json({ error: "key and name are required." }, { status: 400 });
  }

  try {
    const field = await createQuestionField({
      key,
      name,
      systemPrompt,
      explanationPromptTemplate,
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create field. key may already exist." }, { status: 409 });
  }
}
