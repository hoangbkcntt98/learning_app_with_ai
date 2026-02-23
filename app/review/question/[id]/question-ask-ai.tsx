"use client";

import { useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/lib/language";

export function QuestionAskAi({
  prompt,
  options,
}: {
  prompt: string;
  options: [string, string, string, string];
}) {
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [isCachedAnswer, setIsCachedAnswer] = useState(false);
  const [cachedResponsesByLanguage, setCachedResponsesByLanguage] = useState<
    Record<string, string[]>
  >({});
  const [cachedIndexByLanguage, setCachedIndexByLanguage] = useState<Record<string, number>>({});

  function buildPrompt() {
    // Ask AI for a concise explanation of this question and the options.
    return [
      "Please explain this Japanese learning question in a beginner-friendly way.",
      `Question: ${prompt}`,
      `A. ${options[0]}`,
      `B. ${options[1]}`,
      `C. ${options[2]}`,
      `D. ${options[3]}`,
      "Explain key vocabulary and grammar briefly.",
      `Response language: ${language}.`,
    ].join("\n");
  }

  async function askAi() {
    setIsLoading(true);
    setError("");
    const promptText = buildPrompt();
    const cacheKey = language;

    try {
      let cachedResponses = cachedResponsesByLanguage[cacheKey];
      if (!cachedResponses) {
        const cachedResponse = await fetch("/api/ai/chat/cached", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: promptText,
            language,
            source: "explain",
          }),
        });

        if (!cachedResponse.ok) {
          const body = (await cachedResponse.json()) as { error?: string };
          setError(body.error ?? "Could not check cached response.");
          return;
        }

        const body = (await cachedResponse.json()) as { responses?: string[] };
        cachedResponses = body.responses ?? [];
        setCachedResponsesByLanguage((current) => ({
          ...current,
          [cacheKey]: cachedResponses ?? [],
        }));
      }

      const nextCachedIndex = cachedIndexByLanguage[cacheKey] ?? 0;
      if (nextCachedIndex < (cachedResponses?.length ?? 0)) {
        setAnswer(cachedResponses![nextCachedIndex]);
        setIsCachedAnswer(true);
        setCachedIndexByLanguage((current) => ({
          ...current,
          [cacheKey]: nextCachedIndex + 1,
        }));
        return;
      }

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          language,
          forceModel: true,
          source: "explain",
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not get AI response.");
        return;
      }

      const body = (await response.json()) as {
        text?: string;
        messages?: Array<{ role: "user" | "assistant"; text: string }>;
      };

      let assistantText = body.text?.trim() ?? "";
      if (!assistantText && Array.isArray(body.messages)) {
        for (let index = body.messages.length - 1; index >= 0; index -= 1) {
          const item = body.messages[index];
          if (item.role === "assistant" && item.text?.trim()) {
            assistantText = item.text.trim();
            break;
          }
        }
      }

      if (!assistantText) {
        setError("No AI response returned.");
        return;
      }

      setAnswer(assistantText);
      setIsCachedAnswer(false);
    } catch {
      setError("Failed to connect to AI service.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-black/10 p-5">
      <h3 className="text-base font-semibold">Ask AI</h3>
      <p className="mt-1 text-sm text-black/70">
        Get explanation for this question.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-48 flex-col text-sm">
          <span className="mb-1 text-xs font-medium text-black/70">Your language</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
            className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
            disabled={isLoading}
          >
            {LANGUAGE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={askAi}
          disabled={isLoading}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Asking..." : "Ask AI"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {answer ? (
        <div className="mt-3">
          {isCachedAnswer ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Cached
            </p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm">{answer}</p>
        </div>
      ) : null}
    </section>
  );
}
