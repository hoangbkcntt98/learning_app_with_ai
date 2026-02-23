import { NextResponse } from "next/server";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import { listCachedAssistantResponses } from "@/lib/chat";
import { getUserAccessibleQuestionFieldIds } from "@/lib/users";

type CachedRequestBody = {
  prompt?: string;
  language?: string;
  source?: string;
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

function normalizeSource(input: string): "ai_chat" | "explain" {
  // Keep cached-answer lookup separated by feature source.
  return input.trim().toLowerCase() === "explain" ? "explain" : "ai_chat";
}

export async function POST(request: Request) {
  // Return the list of cached assistant answers for a prompt context.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await checkUserFeatureAccess(user, "ai_chat");
  if (!access.allowed) {
    return NextResponse.json({ error: access.message }, { status: 403 });
  }

  const body = (await request.json()) as CachedRequestBody;
  const prompt = body.prompt?.trim() ?? "";
  const language = normalizeLanguage(body.language ?? "");
  const source = normalizeSource(body.source ?? "");
  const fieldId =
    typeof body.fieldId === "number" && Number.isFinite(body.fieldId) && body.fieldId > 0
      ? Math.trunc(body.fieldId)
      : 1;
  const accessibleFieldIds = new Set(await getUserAccessibleQuestionFieldIds(user.email));
  if (!accessibleFieldIds.has(fieldId)) {
    return NextResponse.json({ error: "Selected question field is not accessible." }, { status: 403 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const cachePrompt = `[field:${fieldId}] ${prompt}`;
  const responses = await listCachedAssistantResponses({
    promptText: cachePrompt,
    source,
    language,
    imageHash: "",
  });

  return NextResponse.json({ responses });
}
