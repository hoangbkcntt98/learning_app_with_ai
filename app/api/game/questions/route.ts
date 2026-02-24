import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { readQuestionFields } from "@/lib/question-fields";
import { listQuestionIdsFromUserList } from "@/lib/question-lists";
import { readQuestions, sanitizeQuestion } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";
import { readAppSettings } from "@/lib/settings";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

function seededRng(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleQuestions<T>(items: T[], seed?: number): T[] {
  const shuffled = [...items];
  const random =
    typeof seed === "number" && Number.isFinite(seed) ? seededRng(Math.trunc(seed)) : Math.random;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "learning");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fieldIdParam = searchParams.get("fieldId");
  const levelParam = (searchParams.get("level") ?? "").trim();
  const offsetParam = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const seedParam = Number.parseInt(searchParams.get("seed") ?? "", 10);
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const settings = await readAppSettings();
  const limit = Math.max(1, Math.min(100, settings.questionChunkSize));
  const seed =
    Number.isFinite(seedParam) ? seedParam : Math.floor(Math.random() * 2147483647);
  const fieldId =
    fieldIdParam && Number.isFinite(Number.parseInt(fieldIdParam, 10))
      ? Number.parseInt(fieldIdParam, 10)
      : null;
  const questions = await readQuestions();
  const accessibleFieldIds = new Set(await getUserAccessibleQuestionFieldIds(user.email));
  const hiddenQuestionIds = new Set(
    await listQuestionIdsFromUserList(user.email, "dont_show_again"),
  );
  const visibleQuestions = questions.filter(
    (question) =>
      !hiddenQuestionIds.has(question.id) && accessibleFieldIds.has(question.fieldId),
  );
  const filtered = visibleQuestions.filter((question) => {
    // Filter by selected field and level when provided.
    const matchesField = fieldId ? question.fieldId === fieldId : true;
    const matchesLevel = levelParam ? question.level === levelParam : true;
    return matchesField && matchesLevel;
  });
  const shuffledFiltered = shuffleQuestions(filtered, seed);
  const pagedQuestions = shuffledFiltered.slice(offset, offset + limit);

  const allFields = await readQuestionFields();
  const fieldMap = new Map(allFields.map((item) => [item.id, item]));

  // Return available field/level options for Learning filter dropdowns.
  const fields = Array.from(
    new Map(
      visibleQuestions.map((question) => [
        question.fieldId,
        {
          id: question.fieldId,
          name: question.fieldName,
          explanationPromptTemplate:
            fieldMap.get(question.fieldId)?.explanationPromptTemplate ?? "",
        },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const levels = Array.from(
    new Map(
      visibleQuestions.map((question) => [
        `${question.fieldId}:${question.level}`,
        { fieldId: question.fieldId, level: question.level },
      ]),
    ).values(),
  ).sort((a, b) => a.level.localeCompare(b.level));

  const total = shuffledFiltered.length;
  const nextOffset = offset + pagedQuestions.length;
  const hasMore = nextOffset < total;

  return NextResponse.json({
    points: user.points,
    gold: user.gold,
    level: user.level,
    fields,
    levels,
    questions: pagedQuestions.map(sanitizeQuestion),
    total,
    offset,
    limit,
    nextOffset,
    hasMore,
    seed,
  });
}
