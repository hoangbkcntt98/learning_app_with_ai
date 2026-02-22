import { NextResponse } from "next/server";
import {
  createQuestion,
  isJlptLevel,
  readQuestions,
  sanitizeQuestionForAdmin,
} from "@/lib/questions";
import { getCurrentAdminUser } from "@/lib/session";

export async function GET() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const questions = await readQuestions();
  return NextResponse.json({ questions: questions.map(sanitizeQuestionForAdmin) });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    level?: string;
    prompt?: string;
    options?: string[];
    correctIndex?: number;
  };

  const level = body.level?.trim() ?? "";
  const prompt = body.prompt?.trim() ?? "";
  const options = Array.isArray(body.options) ? body.options.map((item) => item.trim()) : [];
  const correctIndex = body.correctIndex;

  if (!isJlptLevel(level) || !prompt || options.length !== 4) {
    return NextResponse.json(
      { error: "level, prompt and exactly 4 options are required." },
      { status: 400 },
    );
  }

  if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex > 3) {
    return NextResponse.json({ error: "correctIndex must be 0..3." }, { status: 400 });
  }

  try {
    const created = await createQuestion({
      level,
      prompt,
      options: [options[0], options[1], options[2], options[3]],
      correctIndex,
    });
    return NextResponse.json({ question: sanitizeQuestionForAdmin(created) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create question." }, { status: 500 });
  }
}
