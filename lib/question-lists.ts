import { prisma } from "./prisma";
import { sanitizeQuestion, type QuestionRecord } from "./questions";

export type UserQuestionListType = "incorrect" | "review";

const allowedListTypes: UserQuestionListType[] = ["incorrect", "review"];

function mapListQuestion(question: QuestionRecord) {
  // Keep list payload aligned with normal game-safe question response.
  return sanitizeQuestion(question);
}

function mapPrismaQuestionToRecord(question: {
  id: number;
  level: string;
  prompt: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correctIndex: number;
}): QuestionRecord {
  // Convert Prisma question row shape to app-level question record.
  return {
    id: question.id,
    level: question.level as QuestionRecord["level"],
    prompt: question.prompt,
    options: [question.option1, question.option2, question.option3, question.option4],
    correctIndex: question.correctIndex,
  };
}

export function isUserQuestionListType(value: string): value is UserQuestionListType {
  // Validate list type from request input.
  return allowedListTypes.includes(value as UserQuestionListType);
}

export async function addQuestionToUserList(
  userEmail: string,
  questionId: number,
  listType: UserQuestionListType,
) {
  // Upsert to avoid duplicates for the same user/question/list type.
  await prisma.userQuestionList.upsert({
    where: {
      userEmail_questionId_listType: {
        userEmail,
        questionId,
        listType,
      },
    },
    create: {
      userEmail,
      questionId,
      listType,
    },
    update: {},
  });
}

export async function listQuestionsFromUserList(
  userEmail: string,
  listType: UserQuestionListType,
) {
  // Load saved list items ordered newest first and include question details.
  const items = await prisma.userQuestionList.findMany({
    where: {
      userEmail,
      listType,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      question: true,
    },
  });

  return items.map((item) => mapListQuestion(mapPrismaQuestionToRecord(item.question)));
}

export async function removeQuestionFromUserList(
  userEmail: string,
  questionId: number,
  listType: UserQuestionListType,
) {
  // Remove one saved item for this user/list pair.
  await prisma.userQuestionList.deleteMany({
    where: {
      userEmail,
      questionId,
      listType,
    },
  });
}

export async function hasQuestionInUserList(
  userEmail: string,
  questionId: number,
  listType: UserQuestionListType,
) {
  // Check whether the user currently has this question saved in a specific list.
  const found = await prisma.userQuestionList.findFirst({
    where: {
      userEmail,
      questionId,
      listType,
    },
    select: {
      id: true,
    },
  });

  return Boolean(found);
}
