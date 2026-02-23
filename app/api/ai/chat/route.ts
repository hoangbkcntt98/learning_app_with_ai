import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateBedrockText } from "@/lib/bedrock";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import {
  createChatExchange,
  findCachedAssistantResponse,
  listChatMessagesByUser,
  sanitizeChatMessage,
  upsertChatPromptCache,
} from "@/lib/chat";
import type { BedrockImageInput } from "@/lib/bedrock";
import type { ImageFormat } from "@aws-sdk/client-bedrock-runtime";
import { createHash } from "node:crypto";
import { canUseAiModel, incrementDailyAiUsage } from "@/lib/settings";
import { getQuestionFieldSystemPromptById } from "@/lib/question-fields";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

type ChatRequestBody = {
  prompt?: string;
  language?: string;
  forceModel?: boolean;
  source?: string;
  fieldId?: number;
};

const MAX_PROMPT_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function normalizeLanguage(input: string): string {
  // Normalize user-provided labels into one canonical language value.
  const value = input.trim().toLowerCase();
  switch (value) {
    case "japanese":
      return "Japanese";
    case "english":
      return "English";
    case "indonesia":
    case "indonesian":
      return "Indonesian";
    case "thai":
      return "Thai";
    case "vietnamese":
      return "Vietnamese";
    default:
      return "Japanese";
  }
}

function mapMimeTypeToBedrockImageFormat(mimeType: string): ImageFormat | null {
  // Restrict uploads to image formats supported by Bedrock Converse image blocks.
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpeg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

function normalizeSource(input: string): "ai_chat" | "explain" {
  // Scope messages by feature to avoid mixing history between screens.
  return input.trim().toLowerCase() === "explain" ? "explain" : "ai_chat";
}

async function parseChatInput(request: Request): Promise<{
  prompt: string;
  storagePrompt: string;
  language: string;
  source: "ai_chat" | "explain";
  imageHash: string;
  forceModel: boolean;
  fieldId: number;
  image?: BedrockImageInput;
}> {
  // Parse both JSON and multipart requests into one normalized payload.
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const prompt = String(formData.get("prompt") ?? "").trim();
    const language = normalizeLanguage(String(formData.get("language") ?? ""));
    const source = normalizeSource(String(formData.get("source") ?? ""));
    const forceModel = String(formData.get("forceModel") ?? "").toLowerCase() === "true";
    const rawFieldId = Number.parseInt(String(formData.get("fieldId") ?? "1"), 10);
    const fieldId = Number.isFinite(rawFieldId) && rawFieldId > 0 ? rawFieldId : 1;
    const rawImage = formData.get("image");

    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error("prompt is too long (max 2000 characters).");
    }

    let image: BedrockImageInput | undefined;
    let imageHash = "";
    let imageTag = "";

    if (rawImage instanceof File && rawImage.size > 0) {
      if (rawImage.size > MAX_IMAGE_BYTES) {
        throw new Error("image is too large (max 5MB).");
      }
      const format = mapMimeTypeToBedrockImageFormat(rawImage.type);
      if (!format) {
        throw new Error("Unsupported image type. Use JPG, PNG, GIF, or WEBP.");
      }

      const bytes = new Uint8Array(await rawImage.arrayBuffer());
      image = { format, bytes };
      imageHash = createHash("sha256").update(bytes).digest("hex");
      imageTag = `[Image attached: ${rawImage.name || format}]`;
    }

    if (!prompt && !image) {
      throw new Error("prompt or image is required.");
    }

    const modelPrompt = prompt || "Please analyze this image.";
    const storagePrompt = imageTag ? `${modelPrompt}\n${imageTag}` : modelPrompt;
    return {
      prompt: modelPrompt,
      storagePrompt,
      image,
      language,
      source,
      imageHash,
      forceModel,
      fieldId,
    };
  }

  const body = (await request.json()) as ChatRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const source = normalizeSource(body.source ?? "");
  const forceModel = body.forceModel === true;
  const fieldId =
    typeof body.fieldId === "number" && Number.isFinite(body.fieldId) && body.fieldId > 0
      ? Math.trunc(body.fieldId)
      : 1;
  if (!prompt) {
    throw new Error("prompt is required.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("prompt is too long (max 2000 characters).");
  }

  return { prompt, storagePrompt: prompt, language, source, imageHash: "", forceModel, fieldId };
}

function buildChatCachePrompt(prompt: string, fieldId: number) {
  // Include field id so cache lookup stays scoped to the selected field config.
  return `[field:${fieldId}] ${prompt}`;
}

export async function GET(request: Request) {
  // Return chat history for current user, optionally filtered by source.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "ai_chat");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const sourceParam = searchParams.get("source") ?? "";
  const source = sourceParam ? normalizeSource(sourceParam) : undefined;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
  const messages = await listChatMessagesByUser(user.email, limit, source);

  return NextResponse.json({
    messages: messages.map(sanitizeChatMessage),
  });
}

export async function POST(request: Request) {
  // Main chat endpoint: optional cache hit first, then model call fallback.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "ai_chat");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  let parsedInput: Awaited<ReturnType<typeof parseChatInput>>;
  try {
    parsedInput = await parseChatInput(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid chat request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    let text = "";
    let cached = false;
    const accessibleFieldIds = new Set(await getUserAccessibleQuestionFieldIds(user.email));
    if (!accessibleFieldIds.has(parsedInput.fieldId)) {
      return NextResponse.json({ error: "Selected question field is not accessible." }, { status: 403 });
    }
    const cachePrompt = buildChatCachePrompt(parsedInput.prompt, parsedInput.fieldId);
    const fieldSystemPrompt = await getQuestionFieldSystemPromptById(parsedInput.fieldId);
    const languageSystemPrompt = `You must answer strictly in ${parsedInput.language}. Do not use other languages.`;
    const mergedSystemPrompt = [fieldSystemPrompt, languageSystemPrompt].filter(Boolean).join("\n\n");

    if (!parsedInput.forceModel) {
      const cachedText = await findCachedAssistantResponse({
        promptText: cachePrompt,
        source: parsedInput.source,
        language: parsedInput.language,
        imageHash: parsedInput.imageHash,
      });
      if (cachedText) {
        text = cachedText;
        cached = true;
      }
    }

    if (!text) {
      // Enforce daily per-user model-call quota before invoking Bedrock.
      const quota = await canUseAiModel(user.email);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: `Daily AI limit reached (${quota.used}/${quota.limit}). Try again tomorrow.`,
          },
          { status: 429 },
        );
      }

      text = await generateBedrockText(parsedInput.prompt, {
        image: parsedInput.image,
        extraSystemPrompt: mergedSystemPrompt,
      });
      // Count only real model calls; cached responses do not consume quota.
      await incrementDailyAiUsage(user.email);
      await upsertChatPromptCache({
        userEmail: user.email,
        promptText: cachePrompt,
        source: parsedInput.source,
        language: parsedInput.language,
        imageHash: parsedInput.imageHash,
        assistantText: text,
      });
    }

    const savedMessages = await createChatExchange({
      userEmail: user.email,
      userText: parsedInput.storagePrompt,
      assistantText: text,
      source: parsedInput.source,
      language: parsedInput.language,
      imageHash: parsedInput.imageHash,
    });

    return NextResponse.json({
      text,
      messages: savedMessages.map(sanitizeChatMessage),
      cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bedrock request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
