import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listCachedAssistantResponses } from "@/lib/chat";

type CachedRequestBody = {
  prompt?: string;
  language?: string;
  fieldId?: number;
};

function normalizeLanguage(input: string): string {
  // Normalize incoming language labels to backend canonical values.
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

export async function POST(request: Request) {
  // Return cached Ask-AI answers without ai_chat feature restriction.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CachedRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const fieldId =
    typeof body.fieldId === "number" && Number.isFinite(body.fieldId) && body.fieldId > 0
      ? Math.trunc(body.fieldId)
      : 1;

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  // Keep cache key format aligned with /api/ai/ask route.
  const cachePrompt = `[field:${fieldId}] ${prompt}`;
  const responses = await listCachedAssistantResponses({
    promptText: cachePrompt,
    source: "ai_ask",
    language,
    imageHash: "",
  });

  return NextResponse.json({ responses });
}
