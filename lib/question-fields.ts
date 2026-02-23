import { prisma } from "./prisma";

export type QuestionFieldRecord = {
  id: number;
  key: string;
  name: string;
  systemPrompt: string;
  explanationPromptTemplate: string;
};

const DEFAULT_QUESTION_FIELD = {
  id: 1,
  key: "jlpt",
  name: "JLPT",
  systemPrompt: "",
  explanationPromptTemplate: "",
};

function mapQuestionField(row: {
  id: number;
  key: string;
  name: string;
  systemPrompt: string;
  explanationPromptTemplate: string;
}): QuestionFieldRecord {
  // Convert Prisma model into app-level DTO.
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    systemPrompt: row.systemPrompt,
    explanationPromptTemplate: row.explanationPromptTemplate,
  };
}

export async function ensureQuestionFields() {
  // Ensure at least one default field exists for legacy questions.
  const existing = await prisma.questionField.findUnique({
    where: { id: DEFAULT_QUESTION_FIELD.id },
    select: { id: true },
  });
  if (existing) {
    return;
  }

  await prisma.questionField.create({
    data: DEFAULT_QUESTION_FIELD,
  });
}

export async function readQuestionFields() {
  // Return all question fields sorted by ID.
  await ensureQuestionFields();
  const fields = await prisma.questionField.findMany({
    orderBy: { id: "asc" },
  });
  return fields.map(mapQuestionField);
}

export async function findQuestionFieldById(id: number) {
  // Find one question field by numeric ID.
  const field = await prisma.questionField.findUnique({
    where: { id },
  });
  return field ? mapQuestionField(field) : null;
}

export async function createQuestionField(params: {
  key: string;
  name: string;
  systemPrompt?: string;
  explanationPromptTemplate?: string;
}) {
  // Create a new question field for admin-managed contexts.
  const created = await prisma.questionField.create({
    data: {
      key: params.key.trim(),
      name: params.name.trim(),
      systemPrompt: params.systemPrompt?.trim() ?? "",
      explanationPromptTemplate: params.explanationPromptTemplate?.trim() ?? "",
    },
  });
  return mapQuestionField(created);
}

export async function updateQuestionField(params: {
  id: number;
  key?: string;
  name?: string;
  systemPrompt?: string;
  explanationPromptTemplate?: string;
}) {
  // Update one field without changing unspecified values.
  const current = await prisma.questionField.findUnique({
    where: { id: params.id },
  });
  if (!current) {
    return null;
  }

  const updated = await prisma.questionField.update({
    where: { id: params.id },
    data: {
      key: typeof params.key === "string" && params.key.trim() ? params.key.trim() : current.key,
      name:
        typeof params.name === "string" && params.name.trim() ? params.name.trim() : current.name,
      systemPrompt:
        typeof params.systemPrompt === "string"
          ? params.systemPrompt.trim()
          : current.systemPrompt,
      explanationPromptTemplate:
        typeof params.explanationPromptTemplate === "string"
          ? params.explanationPromptTemplate.trim()
          : current.explanationPromptTemplate,
    },
  });
  return mapQuestionField(updated);
}

export async function getQuestionFieldSystemPromptById(id: number) {
  // Resolve one field-level system prompt for AI behaviors.
  const field = await prisma.questionField.findUnique({
    where: { id },
    select: {
      systemPrompt: true,
    },
  });
  return field?.systemPrompt?.trim() ?? "";
}

export async function getQuestionFieldExplanationTemplateById(id: number) {
  // Resolve one field-level explanation prompt template for learning ask flow.
  const field = await prisma.questionField.findUnique({
    where: { id },
    select: {
      explanationPromptTemplate: true,
    },
  });
  return field?.explanationPromptTemplate?.trim() ?? "";
}

export async function deleteQuestionFieldById(id: number) {
  // Delete one question field unless it is the protected default.
  if (id === DEFAULT_QUESTION_FIELD.id) {
    return { ok: false as const, reason: "default" as const };
  }

  const existing = await prisma.questionField.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false as const, reason: "not_found" as const };
  }

  // Related question levels and questions are deleted by DB-level cascade.
  await prisma.questionField.delete({
    where: { id },
  });
  return { ok: true as const };
}
