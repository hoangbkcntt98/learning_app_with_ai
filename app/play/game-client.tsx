"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "../loading-popup";

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
    setCurrentIndex((index) => index + 1);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-8">
      {isLoadingQuestions ? <LoadingPopup message="Loading questions..." /> : null}
      {isSubmittingAnswer ? <LoadingPopup message="Checking your answer..." /> : null}

      <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Play game</h1>
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
                {currentIndex + 1 < questions.length ? (
                  <button
                    type="button"
                    onClick={goToNextQuestion}
                    className="mt-3 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Next question
                  </button>
                ) : (
                  <p className="mt-3 text-sm text-black/70">
                    You reached the end of {level} questions.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
