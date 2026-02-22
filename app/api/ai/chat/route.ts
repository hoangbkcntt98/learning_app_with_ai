import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { generateBedrockText } from "@/lib/bedrock";
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

type ChatRequestBody = {
  prompt?: string;
  language?: string;
  forceModel?: boolean;
  source?: string;
};

const MAX_PROMPT_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function normalizeLanguage(input: string): string {
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
  return input.trim().toLowerCase() === "explain" ? "explain" : "ai_chat";
}

async function parseChatInput(request: Request): Promise<{
  prompt: string;
  storagePrompt: string;
  language: string;
  source: "ai_chat" | "explain";
  imageHash: string;
  forceModel: boolean;
  image?: BedrockImageInput;
}> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const prompt = String(formData.get("prompt") ?? "").trim();
    const language = normalizeLanguage(String(formData.get("language") ?? ""));
    const source = normalizeSource(String(formData.get("source") ?? ""));
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
    return { prompt: modelPrompt, storagePrompt, image, language, source, imageHash, forceModel };
  }

  const body = (await request.json()) as ChatRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const source = normalizeSource(body.source ?? "");
  const forceModel = body.forceModel === true;
  if (!prompt) {
    throw new Error("prompt is required.");
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error("prompt is too long (max 2000 characters).");
  }

  return { prompt, storagePrompt: prompt, language, source, imageHash: "", forceModel };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
      text = await generateBedrockText(parsedInput.prompt, {
        image: parsedInput.image,
        extraSystemPrompt: `You must answer strictly in ${parsedInput.language}. Do not use other languages.`,
      });
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
      messages: savedMessages.map(sanitizeChatMessage),
      cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bedrock request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
