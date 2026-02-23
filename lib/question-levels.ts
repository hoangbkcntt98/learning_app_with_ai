import { prisma } from "./prisma";
import { ensureQuestionFields } from "./question-fields";

export type QuestionLevelRecord = {
  id: number;
  questionFieldId: number;
  fieldName: string;
  name: string;
};

const defaultJlptLevels = ["N5", "N4", "N3", "N2", "N1"];

function mapQuestionLevel(row: {
  id: number;
  questionFieldId: number;
  name: string;
  questionField?: { name: string } | null;
}): QuestionLevelRecord {
  // Convert Prisma row into app-level DTO with field context.
  return {
    id: row.id,
    questionFieldId: row.questionFieldId,
    fieldName: row.questionField?.name ?? "Unknown",
    name: row.name,
  };
}

export async function ensureQuestionLevels() {
  // Seed default JLPT levels for the default JLPT field.
  await ensureQuestionFields();
  for (const levelName of defaultJlptLevels) {
    await prisma.questionLevel.upsert({
      where: {
        questionFieldId_name: {
          questionFieldId: 1,
          name: levelName,
        },
      },
      create: {
        questionFieldId: 1,
        name: levelName,
      },
      update: {},
    });
  }
}

export async function readQuestionLevels(questionFieldId?: number) {
  // Return question levels, optionally filtered by one question field.
  await ensureQuestionLevels();
  const levels = await prisma.questionLevel.findMany({
    where:
      typeof questionFieldId === "number" && questionFieldId > 0
        ? { questionFieldId }
        : undefined,
    include: {
      questionField: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ questionFieldId: "asc" }, { name: "asc" }],
  });
  return levels.map(mapQuestionLevel);
}

export async function findQuestionLevelById(id: number) {
  // Read one level by numeric id.
  const level = await prisma.questionLevel.findUnique({
    where: { id },
    include: {
      questionField: {
        select: {
          name: true,
        },
      },
    },
  });
  return level ? mapQuestionLevel(level) : null;
}

export async function hasQuestionLevelInField(questionFieldId: number, levelName: string) {
  // Validate that the provided level exists within the selected field.
  const level = await prisma.questionLevel.findUnique({
    where: {
      questionFieldId_name: {
        questionFieldId,
        name: levelName.trim(),
      },
    },
    select: {
      id: true,
    },
  });
  return Boolean(level);
}

export async function createQuestionLevel(params: {
  questionFieldId: number;
  name: string;
}) {
  // Create one level under a specific question field.
  const created = await prisma.questionLevel.create({
    data: {
      questionFieldId: params.questionFieldId,
      name: params.name.trim(),
    },
    include: {
      questionField: {
        select: {
          name: true,
        },
      },
    },
  });
  return mapQuestionLevel(created);
}

export async function updateQuestionLevel(params: {
  id: number;
  questionFieldId?: number;
  name?: string;
}) {
  // Update level and keep linked questions consistent when field/name changes.
  const current = await prisma.questionLevel.findUnique({
    where: { id: params.id },
  });
  if (!current) {
    return null;
  }

  const nextFieldId =
    typeof params.questionFieldId === "number" && params.questionFieldId > 0
      ? params.questionFieldId
      : current.questionFieldId;
  const nextName =
    typeof params.name === "string" && params.name.trim() ? params.name.trim() : current.name;

  const [updated] = await prisma.$transaction([
    prisma.questionLevel.update({
      where: { id: params.id },
      data: {
        questionFieldId: nextFieldId,
        name: nextName,
      },
      include: {
        questionField: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.question.updateMany({
      where: {
        questionFieldId: current.questionFieldId,
        level: current.name,
      },
      data: {
        questionFieldId: nextFieldId,
        level: nextName,
      },
    }),
  ]);

  return mapQuestionLevel(updated);
}

export async function deleteQuestionLevelById(id: number) {
  // Delete one level and cascade-delete related questions in the same field/level.
  const current = await prisma.questionLevel.findUnique({
    where: { id },
    select: {
      id: true,
      questionFieldId: true,
      name: true,
    },
  });
  if (!current) {
    return { ok: false as const, reason: "not_found" as const };
  }

  await prisma.$transaction([
    prisma.question.deleteMany({
      where: {
        questionFieldId: current.questionFieldId,
        level: current.name,
      },
    }),
    prisma.questionLevel.delete({
      where: { id },
    }),
  ]);
  return { ok: true as const };
}
