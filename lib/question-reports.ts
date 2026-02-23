import { prisma } from "./prisma";

export type QuestionReportRecord = {
  id: string;
  userName: string;
  userEmail: string;
  questionId: number;
  fieldName: string;
  level: string;
  prompt: string;
  content: string;
  createdAt: string;
};

function mapQuestionReport(row: {
  id: bigint;
  userEmail: string;
  questionId: number;
  content: string;
  createdAt: Date;
  user?: { name: string } | null;
  question: {
    level: string;
    prompt: string;
    questionField?: { name: string } | null;
  };
}): QuestionReportRecord {
  // Map DB row to admin/report list DTO.
  return {
    id: row.id.toString(),
    userName: row.user?.name ?? row.userEmail,
    userEmail: row.userEmail,
    questionId: row.questionId,
    fieldName: row.question.questionField?.name ?? "Unknown",
    level: row.question.level,
    prompt: row.question.prompt,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createQuestionReport(params: {
  userEmail: string;
  questionId: number;
  content: string;
}) {
  // Create one report linked to user and question.
  const created = await prisma.questionReport.create({
    data: {
      userEmail: params.userEmail.trim().toLowerCase(),
      questionId: params.questionId,
      content: params.content.trim(),
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      question: {
        include: {
          questionField: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return mapQuestionReport(created);
}

export async function readQuestionReports() {
  // Return reports newest first for admin management.
  const reports = await prisma.questionReport.findMany({
    include: {
      user: {
        select: {
          name: true,
        },
      },
      question: {
        include: {
          questionField: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return reports.map(mapQuestionReport);
}

export async function findQuestionReportById(id: string) {
  // Return one report with full question detail for report-management detail screen.
  const parsedId = BigInt(id);
  const report = await prisma.questionReport.findUnique({
    where: { id: parsedId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      question: {
        include: {
          questionField: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  if (!report) {
    return null;
  }

  return {
    id: report.id.toString(),
    userName: report.user.name,
    userEmail: report.user.email,
    content: report.content,
    createdAt: report.createdAt.toISOString(),
    question: {
      id: report.question.id,
      fieldName: report.question.questionField?.name ?? "Unknown",
      level: report.question.level,
      prompt: report.question.prompt,
      options: [
        report.question.option1,
        report.question.option2,
        report.question.option3,
        report.question.option4,
      ] as [string, string, string, string],
      correctIndex: report.question.correctIndex,
    },
  };
}
