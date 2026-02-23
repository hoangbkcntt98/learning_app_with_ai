import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeFieldKey(value) {
  // Normalize field key for stable uniqueness and references.
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function titleize(value) {
  // Build a fallback display name from key when name is omitted.
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toQuestionList(input) {
  // Support two shapes: object with questions[] or raw array.
  if (Array.isArray(input)) {
    return { questionFields: [], questions: input };
  }
  if (input && typeof input === "object") {
    const questionFields = Array.isArray(input.questionFields) ? input.questionFields : [];
    const questions = Array.isArray(input.questions) ? input.questions : [];
    return { questionFields, questions };
  }
  throw new Error("Invalid JSON format. Use array or { questionFields, questions }.");
}

function validateQuestion(question, index) {
  // Validate required question fields before DB writes.
  const fieldKey = normalizeFieldKey(question.fieldKey ?? "jlpt");
  const level = String(question.level ?? "").trim();
  const prompt = String(question.prompt ?? "").trim();
  const options = Array.isArray(question.options)
    ? question.options.map((item) => String(item ?? "").trim())
    : [];
  const correctIndex = Number(question.correctIndex);

  if (!fieldKey) {
    throw new Error(`Question[${index}] missing fieldKey.`);
  }
  if (!level) {
    throw new Error(`Question[${index}] missing level.`);
  }
  if (!prompt) {
    throw new Error(`Question[${index}] missing prompt.`);
  }
  if (options.length !== 4 || options.some((item) => !item)) {
    throw new Error(`Question[${index}] must have exactly 4 non-empty options.`);
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error(`Question[${index}] correctIndex must be 0..3.`);
  }

  return { fieldKey, level, prompt, options, correctIndex };
}

async function ensureQuestionField(db, fieldKey, fieldName) {
  // Upsert one question field and return its id.
  const key = normalizeFieldKey(fieldKey);
  const name = String(fieldName ?? "").trim() || titleize(key) || "General";
  const field = await db.questionField.upsert({
    where: { key },
    create: { key, name },
    update: { name },
  });
  return field.id;
}

async function main() {
  const fileArg = process.argv[2] ?? "questions_example.json";
  const shouldReplace = process.argv.includes("--replace");
  const absolutePath = path.resolve(process.cwd(), fileArg);

  // Read and parse source JSON payload from provided path.
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const payload = toQuestionList(parsed);

  if (payload.questions.length === 0) {
    throw new Error("No questions found in JSON file.");
  }

  // Validate all questions first to fail early before touching DB.
  const validatedQuestions = payload.questions.map(validateQuestion);

  // Use a longer timeout because imports can include many upserts/inserts.
  await prisma.$transaction(
    async (tx) => {
      if (shouldReplace) {
        // Optional reset mode to replace all existing questions.
        await tx.question.deleteMany();
      }

      const fieldIdByKey = new Map();

      // Seed explicit field definitions first (if provided).
      for (const field of payload.questionFields) {
        const key = normalizeFieldKey(field.key);
        if (!key) {
          continue;
        }
        const fieldId = await ensureQuestionField(tx, key, field.name);
        fieldIdByKey.set(key, fieldId);

        const levels = Array.isArray(field.levels)
          ? field.levels.map((item) => String(item ?? "").trim()).filter(Boolean)
          : [];
        for (const level of levels) {
          await tx.questionLevel.upsert({
            where: {
              questionFieldId_name: {
                questionFieldId: fieldId,
                name: level,
              },
            },
            create: {
              questionFieldId: fieldId,
              name: level,
            },
            update: {},
          });
        }
      }

      // Insert questions and auto-create missing fields/levels when needed.
      for (const question of validatedQuestions) {
        let fieldId = fieldIdByKey.get(question.fieldKey);
        if (!fieldId) {
          fieldId = await ensureQuestionField(tx, question.fieldKey, titleize(question.fieldKey));
          fieldIdByKey.set(question.fieldKey, fieldId);
        }

        await tx.questionLevel.upsert({
          where: {
            questionFieldId_name: {
              questionFieldId: fieldId,
              name: question.level,
            },
          },
          create: {
            questionFieldId: fieldId,
            name: question.level,
          },
          update: {},
        });

        await tx.question.create({
          data: {
            questionFieldId: fieldId,
            level: question.level,
            prompt: question.prompt,
            option1: question.options[0],
            option2: question.options[1],
            option3: question.options[2],
            option4: question.options[3],
            correctIndex: question.correctIndex,
          },
        });
      }
    },
    {
      // Increase default 5s interactive transaction timeout for bigger files.
      maxWait: 10000,
      timeout: 120000,
    },
  );

  console.log(
    `Import complete. Inserted ${validatedQuestions.length} question(s) from ${path.basename(absolutePath)}.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to import questions from JSON:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
