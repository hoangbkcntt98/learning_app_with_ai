import { prisma } from "./prisma";

export type ChatRole = "user" | "assistant";

export type ChatMessageRecord = {
  id: number;
  userEmail: string;
  exchangeId: number | null;
  role: ChatRole;
  content: string;
  createdAt: string;
};

function mapChatMessage(row: {
  id: bigint;
  userEmail: string;
  exchangeId: bigint | null;
  role: string;
  content: string;
  createdAt: Date;
}): ChatMessageRecord {
  // Convert Prisma row shape (including bigint IDs) into app-level DTO.
  return {
    id: Number(row.id),
    userEmail: row.userEmail,
    exchangeId: row.exchangeId === null ? null : Number(row.exchangeId),
    role: row.role as ChatRole,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export function sanitizeChatMessage(message: ChatMessageRecord) {
  // Return only fields safe/needed for API responses to clients.
  return {
    id: message.id,
    exchangeId: message.exchangeId,
    role: message.role,
    text: message.content,
    createdAt: message.createdAt,
  };
}

export async function findCachedAssistantResponse(params: {
  promptText: string;
  source: "ai_chat" | "explain";
  language: string;
  imageHash: string;
}) {
  // Resolve a single globally cached answer by prompt+language+image hash.
  const cache = await prisma.chatPromptCache.findUnique({
    where: {
      promptText_language_imageHash: {
        promptText: params.promptText,
        language: params.language,
        imageHash: params.imageHash,
      },
    },
  });
  return cache?.assistantText ?? null;
}

export async function upsertChatPromptCache(params: {
  userEmail: string;
  promptText: string;
  source: "ai_chat" | "explain";
  language: string;
  imageHash: string;
  assistantText: string;
}) {
  // Store/refresh the latest answer for a cache key used across users.
  await prisma.chatPromptCache.upsert({
    where: {
      promptText_language_imageHash: {
        promptText: params.promptText,
        language: params.language,
        imageHash: params.imageHash,
      },
    },
    create: {
      userEmail: params.userEmail,
      promptText: params.promptText,
      language: params.language,
      imageHash: params.imageHash,
      assistantText: params.assistantText,
    },
    update: {
      assistantText: params.assistantText,
    },
  });
}

export async function listCachedAssistantResponses(params: {
  promptText: string;
  source: "ai_chat" | "explain";
  language: string;
  imageHash: string;
}) {
  // Return all historical assistant answers for the exact prompt context.
  const exchanges = await prisma.chatExchange.findMany({
    where: {
      userText: params.promptText,
      source: params.source,
      language: params.language,
      imageHash: params.imageHash,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      assistantText: true,
    },
  });

  return exchanges.map((item) => item.assistantText).filter((text) => text.trim().length > 0);
}

export async function listChatMessagesByUser(
  userEmail: string,
  limit = 50,
  source?: "ai_chat" | "explain",
) {
  // Load chat timeline for a user; optionally scope to a feature source.
  const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.trunc(limit))) : 50;

  const messages = await prisma.chatMessage.findMany({
    where: {
      userEmail,
      ...(source
        ? {
            exchange: {
              is: {
                source,
              },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    take: normalizedLimit,
  });
  return messages.map(mapChatMessage);
}

export async function createChatExchange(params: {
  userEmail: string;
  userText: string;
  assistantText: string;
  source: "ai_chat" | "explain";
  language: string;
  imageHash?: string;
}) {
  // Persist one user/assistant pair and link both messages to one exchange.
  const [exchange, userInsert, assistantInsert] = await prisma.$transaction(async (tx) => {
    const createdExchange = await tx.chatExchange.create({
      data: {
        userEmail: params.userEmail,
        userText: params.userText,
        assistantText: params.assistantText,
        source: params.source,
        language: params.language,
        imageHash: params.imageHash ?? "",
      },
    });

    const createdUserMessage = await tx.chatMessage.create({
      data: {
        userEmail: params.userEmail,
        exchangeId: createdExchange.id,
        role: "user",
        content: params.userText,
      },
    });

    const createdAssistantMessage = await tx.chatMessage.create({
      data: {
        userEmail: params.userEmail,
        exchangeId: createdExchange.id,
        role: "assistant",
        content: params.assistantText,
      },
    });

    return [createdExchange, createdUserMessage, createdAssistantMessage] as const;
  });

  return [
    mapChatMessage({ ...userInsert, exchangeId: exchange.id }),
    mapChatMessage({ ...assistantInsert, exchangeId: exchange.id }),
  ] as const;
}
