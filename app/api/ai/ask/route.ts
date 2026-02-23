import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateBedrockText } from "@/lib/bedrock";
import {
  createChatExchange,
  findCachedAssistantResponse,
  upsertChatPromptCache,
} from "@/lib/chat";
import type { BedrockImageInput } from "@/lib/bedrock";
import type { ImageFormat } from "@aws-sdk/client-bedrock-runtime";
import { createHash } from "node:crypto";
import { canUseAiModel, incrementDailyAiUsage } from "@/lib/settings";

type AskRequestBody = {
  prompt?: string;
  language?: string;
  forceModel?: boolean;
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

async function parseAskInput(request: Request): Promise<{
  prompt: string;
  storagePrompt: string;
  language: string;
  source: "ai_ask";
  imageHash: string;
  forceModel: boolean;
  image?: BedrockImageInput;
}> {
  // Parse both JSON and multipart requests into one normalized payload.
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const prompt = String(formData.get("prompt") ?? "").trim();
    const language = normalizeLanguage(String(formData.get("language") ?? ""));
    const forceModel = String(formData.get("forceModel") ?? "").toLowerCase() === "true";
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
      source: "ai_ask",
      imageHash,
      forceModel,
    };
  }

  const body = (await request.json()) as AskRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const forceModel = body.forceModel === true;
  if (!prompt) {
    throw new Error("prompt is required.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("prompt is too long (max 2000 characters).");
  }

  return { prompt, storagePrompt: prompt, language, source: "ai_ask", imageHash: "", forceModel };
}

export async function POST(request: Request) {
  // AI Ask endpoint for Learning explanation and Question Detail Ask AI.
  // Intentionally not gated by feature access rule for ai_chat.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let parsedInput: Awaited<ReturnType<typeof parseAskInput>>;
  try {
    parsedInput = await parseAskInput(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid ask request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    let text = "";
    let cached = false;

    if (!parsedInput.forceModel) {
      const cachedText = await findCachedAssistantResponse({
        promptText: parsedInput.prompt,
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
      // Keep daily quota behavior consistent with existing AI routes.
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
        extraSystemPrompt: `You must answer strictly in ${parsedInput.language}. Do not use other languages.`,
      });
      await incrementDailyAiUsage(user.email);
      await upsertChatPromptCache({
        userEmail: user.email,
        promptText: parsedInput.prompt,
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
      messages: savedMessages.map((item) => ({
        id: item.id,
        exchangeId: item.exchangeId,
        role: item.role,
        text: item.content,
        createdAt: item.createdAt,
      })),
      cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bedrock request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
