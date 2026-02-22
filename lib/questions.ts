import { prisma } from "./prisma";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type QuestionRecord = {
  id: number;
  level: JlptLevel;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

const allowedLevels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

function mapQuestion(row: {
  id: number;
  level: string;
  prompt: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctIndex: number;
}): QuestionRecord {
  // Convert database question row shape into the app-level record format.
  return {
    id: row.id,
    level: row.level as JlptLevel,
    prompt: row.prompt,
    options: [row.option1, row.option2, row.option3, row.option4],
    correctIndex: row.correctIndex,
  };
}

export function isJlptLevel(value: string): value is JlptLevel {
  // Check whether a string is one of the supported JLPT level values.
  return allowedLevels.includes(value as JlptLevel);
}

export async function readQuestions() {
  // Read all questions sorted by ID for deterministic list display.
  const questions = await prisma.question.findMany({
    orderBy: { id: "asc" },
  });
  return questions.map(mapQuestion);
}

export async function findQuestionById(id: number) {
  // Fetch a single question by ID and map it into app format.
  const question = await prisma.question.findUnique({
    where: { id },
  });
  return question ? mapQuestion(question) : null;
}

export async function createQuestion(params: Omit<QuestionRecord, "id">) {
  // Create a new question from app format into DB column format.
  const created = await prisma.question.create({
    data: {
      level: params.level,
      prompt: params.prompt,
      option1: params.options[0],
      option2: params.options[1],
      option3: params.options[2],
      option4: params.options[3],
      correctIndex: params.correctIndex,
    },
  });
  return mapQuestion(created);
}

export async function updateQuestion(params: {
  id: number;
  level?: JlptLevel;
  prompt?: string;
  options?: [string, string, string, string];
  correctIndex?: number;
}) {
  // Partially update a question; missing fields keep their current values.
  const current = await findQuestionById(params.id);
  if (!current) {
    return null;
  }

  const nextLevel = params.level ?? current.level;
  const nextPrompt = params.prompt ?? current.prompt;
  const nextOptions = params.options ?? current.options;
  const nextCorrectIndex =
    typeof params.correctIndex === "number" ? params.correctIndex : current.correctIndex;

  const updated = await prisma.question.update({
    where: { id: params.id },
    data: {
      level: nextLevel,
      prompt: nextPrompt,
      option1: nextOptions[0],
      option2: nextOptions[1],
      option3: nextOptions[2],
      option4: nextOptions[3],
      correctIndex: nextCorrectIndex,
    },
  });

  return mapQuestion(updated);
}

export function sanitizeQuestion(question: QuestionRecord) {
  // Return a student-safe question shape without the correct answer index.
  return {
    id: question.id,
    level: question.level,
    prompt: question.prompt,
    options: question.options,
  };
}

export function sanitizeQuestionForAdmin(question: QuestionRecord) {
  // Return full question details including answer index for admin tools.
  return {
    id: question.id,
    level: question.level,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correctIndex,
  };
}
