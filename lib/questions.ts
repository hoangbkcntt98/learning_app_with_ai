import { ensureSchema, getPool } from "./db";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type QuestionRecord = {
  id: number;
  level: JlptLevel;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

type QuestionRow = {
  id: number;
  level: JlptLevel;
  prompt: string;
  option_1: string;
  option_2: string;
  option_3: string;
  option_4: string;
  correct_index: number;
};

const allowedLevels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

function mapQuestion(row: QuestionRow): QuestionRecord {
  return {
    id: row.id,
    level: row.level,
    prompt: row.prompt,
    options: [row.option_1, row.option_2, row.option_3, row.option_4],
    correctIndex: row.correct_index,
  };
}

export function isJlptLevel(value: string): value is JlptLevel {
  return allowedLevels.includes(value as JlptLevel);
}

export async function readQuestions() {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<QuestionRow>(
    `SELECT id, level, prompt, option_1, option_2, option_3, option_4, correct_index
     FROM questions
     ORDER BY id ASC`,
  );
  return result.rows.map(mapQuestion);
}

export async function findQuestionById(id: number) {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<QuestionRow>(
    `SELECT id, level, prompt, option_1, option_2, option_3, option_4, correct_index
     FROM questions
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] ? mapQuestion(result.rows[0]) : null;
}

export async function createQuestion(params: Omit<QuestionRecord, "id">) {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<QuestionRow>(
    `INSERT INTO questions (level, prompt, option_1, option_2, option_3, option_4, correct_index)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, level, prompt, option_1, option_2, option_3, option_4, correct_index`,
    [
      params.level,
      params.prompt,
      params.options[0],
      params.options[1],
      params.options[2],
      params.options[3],
      params.correctIndex,
    ],
  );
  return mapQuestion(result.rows[0]);
}

export async function updateQuestion(params: {
  id: number;
  level?: JlptLevel;
  prompt?: string;
  options?: [string, string, string, string];
  correctIndex?: number;
}) {
  await ensureSchema();
  const current = await findQuestionById(params.id);
  if (!current) {
    return null;
  }

  const nextLevel = params.level ?? current.level;
  const nextPrompt = params.prompt ?? current.prompt;
  const nextOptions = params.options ?? current.options;
  const nextCorrectIndex =
    typeof params.correctIndex === "number" ? params.correctIndex : current.correctIndex;

  const pool = getPool();
  const result = await pool.query<QuestionRow>(
    `UPDATE questions
     SET level = $2,
         prompt = $3,
         option_1 = $4,
         option_2 = $5,
         option_3 = $6,
         option_4 = $7,
         correct_index = $8
     WHERE id = $1
     RETURNING id, level, prompt, option_1, option_2, option_3, option_4, correct_index`,
    [
      params.id,
      nextLevel,
      nextPrompt,
      nextOptions[0],
      nextOptions[1],
      nextOptions[2],
      nextOptions[3],
      nextCorrectIndex,
    ],
  );

  return result.rows[0] ? mapQuestion(result.rows[0]) : null;
}

export function sanitizeQuestion(question: QuestionRecord) {
  return {
    id: question.id,
    level: question.level,
    prompt: question.prompt,
    options: question.options,
  };
}

export function sanitizeQuestionForAdmin(question: QuestionRecord) {
  return {
    id: question.id,
    level: question.level,
    prompt: question.prompt,
    options: question.options,
    correctIndex: question.correctIndex,
  };
}
