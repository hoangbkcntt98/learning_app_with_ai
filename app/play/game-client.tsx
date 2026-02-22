"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoadingPopup } from "../loading-popup";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/lib/language";

type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

type Question = {
  id: number;
  level: JlptLevel;
  prompt: string;
  options: [string, string, string, string];
};

type AnswerResult = {
  correct: boolean;
  correctIndex: number;
  points: number;
  level: number;
  delta: number;
};

const levels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const optionLabels = ["A", "B", "C", "D"] as const;
type ExplanationSession = {
  prompt: string;
  response: string;
  cached: boolean;
};

export function GameClient({
  initialPoints,
  initialLevel,
}: {
  initialPoints: number;
  initialLevel: number;
}) {
  const [level, setLevel] = useState<JlptLevel>("N5");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [points, setPoints] = useState(initialPoints);
  const [userLevel, setUserLevel] = useState(initialLevel);
  const [error, setError] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [explanationLanguage, setExplanationLanguage] = useState<SupportedLanguage>(
    DEFAULT_LANGUAGE,
  );
  const [explanationsByQuestionLanguage, setExplanationsByQuestionLanguage] = useState<
    Record<string, ExplanationSession>
  >({});
  const [cachedResponsesByQuestionLanguage, setCachedResponsesByQuestionLanguage] = useState<
    Record<string, string[]>
  >({});
  const [cachedResponseIndexByQuestionLanguage, setCachedResponseIndexByQuestionLanguage] =
    useState<Record<string, number>>({});

  const currentQuestion = useMemo(
    () => questions[currentIndex] ?? null,
    [questions, currentIndex],
  );

  useEffect(() => {
    async function loadQuestions() {
      setError("");
      setIsLoadingQuestions(true);
      setAnswerResult(null);
      setSelectedIndex(null);
      setCurrentIndex(0);
      setShowExplanation(false);
      setExplanationError("");
      setExplanationLanguage(DEFAULT_LANGUAGE);
      setExplanationsByQuestionLanguage({});
      setCachedResponsesByQuestionLanguage({});
      setCachedResponseIndexByQuestionLanguage({});

      try {
        const response = await fetch(`/api/game/questions?level=${level}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Could not load questions.");
          setQuestions([]);
          return;
        }

        const body = (await response.json()) as {
          questions: Question[];
          points: number;
          level: number;
        };
        setQuestions(body.questions ?? []);
        setPoints(body.points ?? initialPoints);
        setUserLevel(body.level ?? initialLevel);
      } catch {
        setError("Failed to load questions.");
        setQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    loadQuestions();
  }, [level, initialLevel, initialPoints]);

  async function submitAnswer(selectedIndex: number) {
    if (!currentQuestion || answerResult || isSubmittingAnswer) {
      return;
    }

    setError("");
    setIsSubmittingAnswer(true);
    setSelectedIndex(selectedIndex);

    try {
      const response = await fetch("/api/game/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          selectedIndex,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not submit answer.");
        return;
      }

      const body = (await response.json()) as AnswerResult;
      setAnswerResult(body);
      setPoints(body.points);
      setUserLevel(body.level);
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  function goToNextQuestion() {
    setAnswerResult(null);
    setSelectedIndex(null);
    setShowExplanation(false);
    setExplanationError("");
    setExplanationLanguage(DEFAULT_LANGUAGE);
    setExplanationsByQuestionLanguage({});
    setCachedResponsesByQuestionLanguage({});
    setCachedResponseIndexByQuestionLanguage({});
    setCurrentIndex((index) => index + 1);
  }

  function buildExplanationPrompt(
    question: Question,
    selected: number,
    result: AnswerResult,
    language: string,
  ) {
    const selectedLabel = optionLabels[selected];
    const correctLabel = optionLabels[result.correctIndex];
    const selectedOption = question.options[selected];
    const correctOption = question.options[result.correctIndex];

    if (result.correct) {
      return [
        "I answered a Japanese multiple-choice question correctly.",
        `Question: ${question.prompt}`,
        `Selected option (${selectedLabel}): ${selectedOption}`,
        "Please explain the meaning of the key Japanese word(s) in this answer,",
        "and why this option is correct. Keep it concise and beginner-friendly.",
        `Response language: ${language}.`,
      ].join("\n");
    }

    return [
      "I answered a Japanese multiple-choice question incorrectly.",
      `Question: ${question.prompt}`,
      `My selected option (${selectedLabel}): ${selectedOption}`,
      `Correct option (${correctLabel}): ${correctOption}`,
      "Please explain why my selected option is incorrect and why the correct option is true.",
      "Keep it concise and beginner-friendly.",
      `Response language: ${language}.`,
    ].join("\n");
  }

  function explainCurrentQuestion() {
    if (!currentQuestion || !answerResult || selectedIndex === null) {
      return;
    }

    setShowExplanation(true);
    setExplanationError("");
  }

  async function applyExplanationLanguage() {
    if (!currentQuestion || !answerResult || selectedIndex === null) {
      return;
    }

    setShowExplanation(true);
    setExplanationError("");

    const explanationKey = `${currentQuestion.id}:${explanationLanguage}`;
    const prompt = buildExplanationPrompt(
      currentQuestion,
      selectedIndex,
      answerResult,
      explanationLanguage,
    );

    let cachedResponses = cachedResponsesByQuestionLanguage[explanationKey];
    if (!cachedResponses) {
      setIsLoadingExplanation(true);
      try {
        const cachedResponse = await fetch("/api/ai/chat/cached", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            language: explanationLanguage,
            source: "explain",
          }),
        });

        if (!cachedResponse.ok) {
          const body = (await cachedResponse.json()) as { error?: string };
          setExplanationError(body.error ?? "Could not load cached responses.");
          return;
        }

        const body = (await cachedResponse.json()) as { responses?: string[] };
        cachedResponses = body.responses ?? [];
        setCachedResponsesByQuestionLanguage((prev) => ({
          ...prev,
          [explanationKey]: cachedResponses ?? [],
        }));
      } catch {
        setExplanationError("Failed to load cached responses.");
        return;
      } finally {
        setIsLoadingExplanation(false);
      }
    }

    const nextCachedIndex = cachedResponseIndexByQuestionLanguage[explanationKey] ?? 0;
    if (nextCachedIndex < (cachedResponses?.length ?? 0)) {
      const cachedResponseText = cachedResponses![nextCachedIndex];
      setExplanationsByQuestionLanguage((prev) => ({
        ...prev,
        [explanationKey]: {
          prompt,
          response: cachedResponseText,
          cached: true,
        },
      }));
      setCachedResponseIndexByQuestionLanguage((prev) => ({
        ...prev,
        [explanationKey]: nextCachedIndex + 1,
      }));
      return;
    }

    setIsLoadingExplanation(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language: explanationLanguage,
          forceModel: true,
          source: "explain",
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setExplanationError(body.error ?? "Could not generate explanation.");
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
        setExplanationError("No explanation returned.");
        return;
      }

      setExplanationsByQuestionLanguage((prev) => ({
        ...prev,
        [explanationKey]: {
          prompt,
          response: assistantText,
          cached: false,
        },
      }));
    } catch {
      setExplanationError("Failed to generate explanation.");
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  const isLastQuestion = currentIndex + 1 >= questions.length;
  const canGoToNextQuestion = answerResult !== null && !isLastQuestion;
  const canExplain = answerResult !== null && selectedIndex !== null;
  const explanationKey = currentQuestion ? `${currentQuestion.id}:${explanationLanguage}` : "";
  const currentExplanation = currentQuestion
    ? explanationsByQuestionLanguage[explanationKey]
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-8">
      {isLoadingQuestions ? <LoadingPopup message="Loading questions..." /> : null}
      {isSubmittingAnswer ? <LoadingPopup message="Checking your answer..." /> : null}

      {/* Show app panda logo on this user route for consistent branding. */}
      <Image
        src="/images/logo.png"
        alt="BuBu Learning panda logo"
        width={112}
        height={112}
        className="mb-6 h-28 w-28 rounded-xl object-cover"
        priority
      />

      <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Learning</h1>
          <Link href="/" className="text-sm text-blue-700 underline">
            Back to menu
          </Link>
        </div>

        <p className="mt-2 text-sm text-black/70">
          Points: <strong>{points}</strong>
        </p>
        <p className="mt-1 text-sm text-black/70">
          Level: <strong>{userLevel}</strong>
        </p>

        <div className="mt-5">
          <label className="text-sm font-medium">JLPT level</label>
          <select
            className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            value={level}
            onChange={(event) => setLevel(event.target.value as JlptLevel)}
          >
            {levels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!isLoadingQuestions && !currentQuestion ? (
          <p className="mt-6 text-sm text-black/70">
            No questions found for {level}. Run the seed script to add data.
          </p>
        ) : null}

        {currentQuestion ? (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-black/60">
              {currentQuestion.level} question {currentIndex + 1}/{questions.length}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{currentQuestion.prompt}</h2>

            <div className="mt-4 grid gap-3">
              {currentQuestion.options.map((option, index) => {
                const showAnswer = answerResult !== null;
                const isCorrectAnswer = answerResult?.correctIndex === index;
                const isWrongSelected =
                  showAnswer &&
                  selectedIndex === index &&
                  !isCorrectAnswer;

                return (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    type="button"
                    disabled={showAnswer || isSubmittingAnswer}
                    onClick={() => submitAnswer(index)}
                    className={`rounded-lg border px-4 py-2 text-left text-sm ${
                      showAnswer && isCorrectAnswer
                        ? "border-green-600 bg-green-50"
                        : isWrongSelected
                          ? "border-red-300 bg-red-50"
                          : "border-black/20"
                    }`}
                  >
                    {isSubmittingAnswer && selectedIndex === index
                      ? "Submitting..."
                      : `${optionLabels[index]}. ${option}`}
                  </button>
                );
              })}
            </div>

            {answerResult ? (
              <div className="mt-4">
                <p className="text-sm">
                  {answerResult.correct ? "Correct! +5 points." : "Incorrect. -5 points."}
                </p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToNextQuestion}
                disabled={!canGoToNextQuestion}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Next question
              </button>
              <button
                type="button"
                onClick={explainCurrentQuestion}
                disabled={!canExplain}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Explain It
              </button>
            </div>

            {answerResult && isLastQuestion ? (
              <p className="mt-3 text-sm text-black/70">
                You reached the end of {level} questions.
              </p>
            ) : null}

            {showExplanation ? (
              <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.02] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                  AI explanation
                </p>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-48 flex-col text-sm">
                    <span className="mb-1 text-xs font-medium text-black/70">Your languge</span>
                    <select
                      value={explanationLanguage}
                      onChange={(event) =>
                        setExplanationLanguage(
                          event.target.value as SupportedLanguage,
                        )
                      }
                      className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
                    >
                      {LANGUAGE_OPTIONS.map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={applyExplanationLanguage}
                    disabled={isLoadingExplanation}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Ask AI
                  </button>
                </div>

                {isLoadingExplanation ? (
                  <p className="mt-3 text-sm text-blue-700">Generating explanation...</p>
                ) : currentExplanation ? (
                  <div className="mt-3">
                    {currentExplanation.cached ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Cached
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-sm">{currentExplanation.response}</p>
                  </div>
                ) : explanationError ? (
                  <p className="mt-3 text-sm text-red-600">{explanationError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
