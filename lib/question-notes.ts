import { prisma } from "./prisma";

export async function getUserQuestionNote(userEmail: string, questionId: number) {
  // Read the current note text for one user/question pair.
  const item = await prisma.userQuestionNote.findUnique({
    where: {
      userEmail_questionId: {
        userEmail,
        questionId,
      },
    },
    select: {
      note: true,
    },
  });

  return item?.note ?? "";
}

export async function upsertUserQuestionNote(
  userEmail: string,
  questionId: number,
  note: string,
) {
  // Create or update the user note for this question.
  await prisma.userQuestionNote.upsert({
    where: {
      userEmail_questionId: {
        userEmail,
        questionId,
      },
    },
    create: {
      userEmail,
      questionId,
      note,
    },
    update: {
      note,
    },
  });
}
