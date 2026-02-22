import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { listCachedAssistantResponses } from "@/lib/chat";

type CachedRequestBody = {
  prompt?: string;
  language?: string;
  source?: string;
};

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

function normalizeSource(input: string): "ai_chat" | "explain" {
  return input.trim().toLowerCase() === "explain" ? "explain" : "ai_chat";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as CachedRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const source = normalizeSource(body.source ?? "");

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const responses = await listCachedAssistantResponses({
    promptText: prompt,
    source,
    language,
    imageHash: "",
  });

  return NextResponse.json({ responses });
}
