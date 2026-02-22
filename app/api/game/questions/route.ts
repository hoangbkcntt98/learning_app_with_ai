import { NextResponse } from "next/server";
import { isJlptLevel, readQuestions, sanitizeQuestion } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const levelParam = searchParams.get("level");
  const questions = await readQuestions();
  const filtered = levelParam && isJlptLevel(levelParam)
    ? questions.filter((question) => question.level === levelParam)
    : questions;

  return NextResponse.json({
    points: user.points,
    level: user.level,
    questions: filtered.map(sanitizeQuestion),
  });
}
