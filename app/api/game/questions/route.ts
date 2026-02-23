import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { readQuestionFields } from "@/lib/question-fields";
import { listQuestionIdsFromUserList } from "@/lib/question-lists";
import { readQuestions, sanitizeQuestion } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

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

  return NextResponse.json({
    points: user.points,
    gold: user.gold,
    level: user.level,
    fields,
    levels,
    questions: filtered.map(sanitizeQuestion),
  });
}
