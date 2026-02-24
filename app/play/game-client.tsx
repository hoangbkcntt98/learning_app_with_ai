"use client";

import { type ClipboardEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoadingPopup } from "../loading-popup";
import { FeedbackPopup } from "../feedback-popup";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type SupportedLanguage } from "@/lib/language";
import { type UserSummary, UserSummaryCard } from "../user-summary-card";

type Question = {
  id: number;
  fieldId: number;
  fieldName: string;
  level: string;
  prompt: string;
  options: [string, string, string, string];
};

type QuestionField = {
  id: number;
  name: string;
  explanationPromptTemplate: string;
};

type QuestionLevel = {
  fieldId: number;
  level: string;
};

type AnswerResult = {
  correct: boolean;
  correctIndex: number;
  points: number;
  gold: number;
  level: number;
  delta: number;
  bonusPoints?: number;
  goldDelta?: number;
  streak?: number;
};

const optionLabels = ["A", "B", "C", "D"] as const;
type ExplanationSession = {
  prompt: string;
  response: string;
  cached: boolean;
};

type AdminChatMessage = {
  id: number | string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  cached?: boolean;
};

const QUESTION_CHUNK_SIZE = 20;

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ExplainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
      <path d="M12 7v6M9 10h6" />
    </svg>
  );
}

function HideIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 3v18" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

function AdminAskIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
    </svg>
  );
}

const defaultExplanationTemplate = [
  "I answered a Japanese multiple-choice question {{resultStateText}}.",
  "Question: {{question}}",
  "My selected option ({{selectedLabel}}): {{selectedOption}}",
  "Correct option ({{correctLabel}}): {{correctOption}}",
  "{{explanationInstruction}}",
  "Keep it concise and beginner-friendly.",
  "Response language: {{language}}.",
].join("\n");

function fillTemplate(template: string, variables: Record<string, string>) {
  // Replace {{variable}} placeholders with runtime values.
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, rawKey) => {
    const key = String(rawKey).trim();
    return variables[key] ?? "";
  });
}

export function GameClient({
  initialPoints,
  initialGold,
  initialLevel,
  isAdmin,
  summaryUser,
}: {
  initialPoints: number;
  initialGold: number;
  initialLevel: number;
  isAdmin: boolean;
  summaryUser: UserSummary;
}) {
  const [fields, setFields] = useState<QuestionField[]>([]);
  const [levels, setLevels] = useState<QuestionLevel[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isLoadingMoreQuestions, setIsLoadingMoreQuestions] = useState(false);
  const [hasMoreQuestions, setHasMoreQuestions] = useState(false);
  const [nextQuestionOffset, setNextQuestionOffset] = useState(0);
  const [questionSeed, setQuestionSeed] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [points, setPoints] = useState(initialPoints);
  const [gold, setGold] = useState(initialGold);
  const [userLevel, setUserLevel] = useState(initialLevel);
  const [error, setError] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAnswerFeedbackPopup, setShowAnswerFeedbackPopup] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const [reviewListStatus, setReviewListStatus] = useState("");
  const [reviewListError, setReviewListError] = useState("");
  const [isSavingReviewList, setIsSavingReviewList] = useState(false);
  const [dontShowStatus, setDontShowStatus] = useState("");
  const [dontShowError, setDontShowError] = useState("");
  const [isSavingDontShow, setIsSavingDontShow] = useState(false);
  const [showReportBox, setShowReportBox] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportError, setReportError] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
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
  const [showAdminAsk, setShowAdminAsk] = useState(false);
  const [adminPrompt, setAdminPrompt] = useState("");
  const [adminChatMessages, setAdminChatMessages] = useState<AdminChatMessage[]>([]);
  const [adminAskError, setAdminAskError] = useState("");
  const [isLoadingAdminAsk, setIsLoadingAdminAsk] = useState(false);
  const [adminChatLanguage, setAdminChatLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [adminSelectedImage, setAdminSelectedImage] = useState<File | null>(null);
  const adminImageInputRef = useRef<HTMLInputElement | null>(null);
  const adminSelectedImagePreviewUrl = useMemo(
    () => (adminSelectedImage ? URL.createObjectURL(adminSelectedImage) : null),
    [adminSelectedImage],
  );

  const currentQuestion = useMemo(
    () => questions[currentIndex] ?? null,
    [questions, currentIndex],
  );
  const selectableLevels = useMemo(
    () =>
      levels.filter((item) =>
        selectedFieldId === null ? true : item.fieldId === selectedFieldId,
      ),
    [levels, selectedFieldId],
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
      setReviewListStatus("");
      setReviewListError("");
      setDontShowStatus("");
      setDontShowError("");
      setShowReportBox(false);
      setReportText("");
      setReportStatus("");
      setReportError("");
      setExplanationLanguage(DEFAULT_LANGUAGE);
      setExplanationsByQuestionLanguage({});
      setCachedResponsesByQuestionLanguage({});
      setCachedResponseIndexByQuestionLanguage({});

      try {
        const params = new URLSearchParams();
        if (selectedFieldId !== null) {
          params.set("fieldId", String(selectedFieldId));
        }
        if (selectedLevel) {
          params.set("level", selectedLevel);
        }
        const generatedSeed = Math.floor(Math.random() * 2147483647);
        params.set("offset", "0");
        params.set("limit", String(QUESTION_CHUNK_SIZE));
        params.set("seed", String(generatedSeed));
        const response = await fetch(`/api/game/questions?${params.toString()}`);
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Could not load questions.");
          setQuestions([]);
          setHasMoreQuestions(false);
          setNextQuestionOffset(0);
          setQuestionSeed(null);
          return;
        }

        const body = (await response.json()) as {
          questions: Question[];
          fields: QuestionField[];
          levels: QuestionLevel[];
          points: number;
          gold?: number;
          level: number;
          hasMore?: boolean;
          nextOffset?: number;
          seed?: number;
        };
        const nextFields = body.fields ?? [];
        const nextLevels = body.levels ?? [];
        setFields(nextFields);
        setLevels(nextLevels);
        const initialChunk = body.questions ?? [];
        setQuestions(initialChunk);
        setHasMoreQuestions(Boolean(body.hasMore));
        setNextQuestionOffset(
          typeof body.nextOffset === "number" ? body.nextOffset : initialChunk.length,
        );
        setQuestionSeed(typeof body.seed === "number" ? body.seed : generatedSeed);
        setPoints(body.points ?? initialPoints);
        setGold(typeof body.gold === "number" ? body.gold : initialGold);
        setUserLevel(body.level ?? initialLevel);
        if (nextFields.length > 0 && selectedFieldId === null) {
          setSelectedFieldId(nextFields[0].id);
        }
        if (!selectedLevel) {
          const initialSelectableLevel =
            nextLevels.find((item) =>
              selectedFieldId === null ? true : item.fieldId === selectedFieldId,
            )?.level ?? "";
          setSelectedLevel(initialSelectableLevel);
        }
      } catch {
        setError("Failed to load questions.");
        setQuestions([]);
        setHasMoreQuestions(false);
        setNextQuestionOffset(0);
        setQuestionSeed(null);
      } finally {
        setIsLoadingQuestions(false);
      }
    }

    loadQuestions();
  }, [selectedFieldId, selectedLevel, initialGold, initialLevel, initialPoints]);

  useEffect(() => {
    // Lazy-load next chunk before learner reaches the end of current chunk.
    if (isLoadingQuestions || isLoadingMoreQuestions || !hasMoreQuestions || questionSeed === null) {
      return;
    }
    if (currentIndex < Math.max(0, questions.length - 5)) {
      return;
    }

    let cancelled = false;
    async function loadMoreQuestions() {
      setIsLoadingMoreQuestions(true);
      try {
        const params = new URLSearchParams();
        if (selectedFieldId !== null) {
          params.set("fieldId", String(selectedFieldId));
        }
        if (selectedLevel) {
          params.set("level", selectedLevel);
        }
        params.set("offset", String(nextQuestionOffset));
        params.set("limit", String(QUESTION_CHUNK_SIZE));
        params.set("seed", String(questionSeed));

        const response = await fetch(`/api/game/questions?${params.toString()}`);
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as {
          questions: Question[];
          hasMore?: boolean;
          nextOffset?: number;
        };
        if (cancelled) {
          return;
        }

        const loadedChunk = body.questions ?? [];
        if (loadedChunk.length > 0) {
          setError("");
        }
        setQuestions((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const dedupedIncoming = loadedChunk.filter((item) => !existingIds.has(item.id));
          return dedupedIncoming.length > 0 ? [...prev, ...dedupedIncoming] : prev;
        });
        setHasMoreQuestions(Boolean(body.hasMore));
        setNextQuestionOffset(
          typeof body.nextOffset === "number"
            ? body.nextOffset
            : nextQuestionOffset + loadedChunk.length,
        );
      } finally {
        if (!cancelled) {
          setIsLoadingMoreQuestions(false);
        }
      }
    }

    loadMoreQuestions();
    return () => {
      cancelled = true;
    };
  }, [
    currentIndex,
    hasMoreQuestions,
    isLoadingMoreQuestions,
    isLoadingQuestions,
    nextQuestionOffset,
    questionSeed,
    questions.length,
    selectedFieldId,
    selectedLevel,
  ]);

  useEffect(() => {
    return () => {
      if (adminSelectedImagePreviewUrl) {
        URL.revokeObjectURL(adminSelectedImagePreviewUrl);
      }
    };
  }, [adminSelectedImagePreviewUrl]);

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
      setGold(body.gold);
      setUserLevel(body.level);
      setShowAnswerFeedbackPopup(true);
    } catch {
      setError("Failed to submit answer.");
    } finally {
      setIsSubmittingAnswer(false);
    }
  }

  function goToNextQuestion() {
    if (currentIndex + 1 >= questions.length) {
      if (hasMoreQuestions) {
        setError("Loading next questions...");
      }
      return;
    }

    setError("");
    setAnswerResult(null);
    setSelectedIndex(null);
    setShowAnswerFeedbackPopup(false);
    setShowExplanation(false);
    setExplanationError("");
    setReviewListStatus("");
    setReviewListError("");
    setDontShowStatus("");
    setDontShowError("");
    setShowReportBox(false);
    setReportText("");
    setReportStatus("");
    setReportError("");
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
    // Build prompt from field template so each field can customize AI explanation style.
    const selectedField = fields.find((item) => item.id === question.fieldId);
    const template = selectedField?.explanationPromptTemplate?.trim() || defaultExplanationTemplate;
    const selectedLabel = optionLabels[selected];
    const correctLabel = optionLabels[result.correctIndex];
    const selectedOption = question.options[selected];
    const correctOption = question.options[result.correctIndex];
    const allOptionsText = question.options
      .map((option, index) => `${optionLabels[index]}. ${option}`)
      .join("\n");
    const fillTemplateText = fillTemplate(template, {
      question: question.prompt,
      selectedLabel,
      selectedOption,
      correctLabel,
      correctOption,
      allOptions: allOptionsText,
      language,
      resultStateText: result.correct ? "correctly" : "incorrectly",
      explanationInstruction: result.correct
        ? "Please explain why this option is correct."
        : "Please explain why my selected option is incorrect and why the correct option is true.",
    });
    return fillTemplateText;
  }

  function explainCurrentQuestion() {
    if (!currentQuestion || !answerResult || selectedIndex === null) {
      return;
    }

    setShowExplanation(true);
    setExplanationError("");
  }

  async function addCurrentQuestionToReviewList() {
    if (!currentQuestion || isSavingReviewList) {
      return;
    }

    setReviewListStatus("");
    setReviewListError("");
    setIsSavingReviewList(true);
    try {
      const response = await fetch("/api/game/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          type: "review",
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setReviewListError(body.error ?? "Could not add to review list.");
        return;
      }

      setReviewListStatus("Added to review list.");
    } catch {
      setReviewListError("Failed to add to review list.");
    } finally {
      setIsSavingReviewList(false);
    }
  }

  async function addCurrentQuestionToDontShowList() {
    if (!currentQuestion || isSavingDontShow) {
      return;
    }

    setDontShowStatus("");
    setDontShowError("");
    setIsSavingDontShow(true);
    try {
      const response = await fetch("/api/game/lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          type: "dont_show_again",
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setDontShowError(body.error ?? "Could not add to don't show list.");
        return;
      }

      setDontShowStatus("Added to don't show list.");
    } catch {
      setDontShowError("Failed to add to don't show list.");
    } finally {
      setIsSavingDontShow(false);
    }
  }

  async function submitQuestionReport() {
    // Submit one report for the current question.
    if (!currentQuestion || isSubmittingReport) {
      return;
    }
    const trimmedReport = reportText.trim();
    if (!trimmedReport) {
      setReportError("Please enter report content.");
      return;
    }

    setReportError("");
    setReportStatus("");
    setIsSubmittingReport(true);
    try {
      const response = await fetch("/api/game/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          content: trimmedReport,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setReportError(body.error ?? "Failed to submit report.");
        return;
      }

      setReportStatus("Report submitted.");
      setReportText("");
      setShowReportBox(false);
    } catch {
      setReportError("Failed to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
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
        const cachedResponse = await fetch("/api/ai/ask/cached", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            language: explanationLanguage,
            fieldId: currentQuestion.fieldId,
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
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language: explanationLanguage,
          fieldId: currentQuestion.fieldId,
          forceModel: true,
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
      window.dispatchEvent(new Event("ai:usage-updated"));
    } catch {
      setExplanationError("Failed to generate explanation.");
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  async function askAiAsAdmin() {
    // Admin-only free chat that still uses selected question field system prompt.
    if (!isAdmin) {
      return;
    }
    const trimmedPrompt = adminPrompt.trim();
    if (!trimmedPrompt && !adminSelectedImage) {
      setAdminAskError("Please enter a prompt or choose an image.");
      return;
    }

    setAdminAskError("");
    setIsLoadingAdminAsk(true);
    const imageInfo = adminSelectedImage ? `[Image attached: ${adminSelectedImage.name}]` : "";
    const optimisticText = imageInfo
      ? `${trimmedPrompt || "Please analyze this image."}\n${imageInfo}`
      : trimmedPrompt;
    const optimisticId = `admin-temp-${Date.now()}`;
    setAdminChatMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        role: "user",
        text: optimisticText,
        createdAt: new Date().toISOString(),
      },
    ]);
    setAdminPrompt("");
    setAdminSelectedImage(null);
    if (adminImageInputRef.current) {
      adminImageInputRef.current.value = "";
    }

    try {
      const formData = new FormData();
      formData.append("prompt", trimmedPrompt);
      formData.append("language", adminChatLanguage);
      formData.append("fieldId", String(currentQuestion?.fieldId ?? selectedFieldId ?? 1));
      if (adminSelectedImage) {
        formData.append("image", adminSelectedImage);
      }

      const response = await fetch("/api/ai/ask", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setAdminAskError(body.error ?? "Could not get AI response.");
        return;
      }

      const body = (await response.json()) as {
        text?: string;
        cached?: boolean;
        messages?: Array<{
          id: number | string;
          role: "user" | "assistant";
          text: string;
          createdAt: string;
        }>;
      };
      if (!body.messages || body.messages.length === 0) {
        setAdminAskError("No AI response returned.");
        return;
      }
      const mappedMessages: AdminChatMessage[] = body.messages.map((item) => ({
        id: item.id,
        role: item.role,
        text: item.text,
        createdAt: item.createdAt,
        cached: item.role === "assistant" ? Boolean(body.cached) : undefined,
      }));
      setAdminChatMessages((prev) => {
        const withoutOptimistic = prev.filter((message) => message.id !== optimisticId);
        return [...withoutOptimistic, ...mappedMessages];
      });
      window.dispatchEvent(new Event("ai:usage-updated"));
    } catch {
      setAdminAskError("Failed to connect to AI service.");
    } finally {
      setIsLoadingAdminAsk(false);
    }
  }

  function handleAdminPromptPaste(event: ClipboardEvent<HTMLInputElement>) {
    // Allow pasting an image directly into admin chat prompt input.
    const items = event.clipboardData?.items;
    if (!items?.length) {
      return;
    }
    for (const item of Array.from(items)) {
      if (!item.type.startsWith("image/")) {
        continue;
      }
      const file = item.getAsFile();
      if (!file) {
        continue;
      }
      const extension = file.type.split("/")[1] || "png";
      const namedFile = new File([file], `pasted-image.${extension}`, { type: file.type });
      setAdminSelectedImage(namedFile);
      return;
    }
  }

  async function submitAdminAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!adminPrompt.trim() && !adminSelectedImage) || isLoadingAdminAsk) {
      return;
    }
    await askAiAsAdmin();
  }

  const isLastLoadedQuestion = currentIndex + 1 >= questions.length;
  const isLastQuestion = isLastLoadedQuestion && !hasMoreQuestions;
  const canGoToNextQuestion =
    answerResult !== null &&
    !isLastQuestion &&
    (!isLastLoadedQuestion || !isLoadingMoreQuestions);
  const canExplain = answerResult !== null && selectedIndex !== null;
  const explanationKey = currentQuestion ? `${currentQuestion.id}:${explanationLanguage}` : "";
  const currentExplanation = currentQuestion
    ? explanationsByQuestionLanguage[explanationKey]
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center px-6 py-8">
      {isLoadingQuestions ? <LoadingPopup message="Loading questions..." /> : null}
      {isLoadingMoreQuestions ? <LoadingPopup message="Loading more questions..." /> : null}
      {isSubmittingAnswer ? <LoadingPopup message="Checking your answer..." /> : null}
      {answerResult && (answerResult.bonusPoints ?? 0) > 0 ? (
        <FeedbackPopup
          isOpen={showAnswerFeedbackPopup}
          title="Streak reward!"
          message={`You reached 5 correct answers in a row and earned ${answerResult.bonusPoints} bonus points.`}
          imageSrc="/images/bonous.png"
          imageAlt="Streak reward celebration"
          tone="success"
          onClose={() => setShowAnswerFeedbackPopup(false)}
        />
      ) : answerResult ? (
        <FeedbackPopup
          isOpen={showAnswerFeedbackPopup}
          title={
            answerResult.correct
              ? `Correct! +${Math.max(0, answerResult.delta)} points, +${answerResult.goldDelta ?? 0} gold.`
              : `Incorrect. ${answerResult.delta} points.`
          }
          message={answerResult.correct ? "すごいね！" : "ざんねんね！"}
          imageSrc={answerResult.correct ? "/images/correct.png" : "/images/incorrect.png"}
          imageAlt={answerResult.correct ? "Correct answer celebration" : "Incorrect answer reaction"}
          tone={answerResult.correct ? "success" : "error"}
          onClose={() => setShowAnswerFeedbackPopup(false)}
        />
      ) : null}

      <UserSummaryCard
        user={{
          ...summaryUser,
          points,
          gold,
          level: userLevel,
        }}
      />

      <div className="mt-6 w-full rounded-2xl border border-black/10 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Learning</h1>
          <Link href="/" className="text-sm text-blue-700 underline">
            Back to menu
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium">Field</span>
            <select
              className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              value={selectedFieldId ?? ""}
              onChange={(event) => {
                const nextFieldId = Number.parseInt(event.target.value || "0", 10);
                setSelectedFieldId(Number.isFinite(nextFieldId) && nextFieldId > 0 ? nextFieldId : null);
                const nextLevel =
                  levels.find((item) => item.fieldId === nextFieldId)?.level ?? "";
                setSelectedLevel(nextLevel);
              }}
            >
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Level</span>
            <select
              className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              value={selectedLevel}
              onChange={(event) => setSelectedLevel(event.target.value)}
            >
              {selectableLevels.map((item) => (
                <option key={`${item.fieldId}:${item.level}`} value={item.level}>
                  {item.level}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {!isLoadingQuestions && !currentQuestion ? (
          <p className="mt-6 text-sm text-black/70">
            No questions found for the selected field and level.
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

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToNextQuestion}
                disabled={!canGoToNextQuestion}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                aria-label="Next question"
              >
                <span className="sm:hidden">
                  <NextIcon />
                </span>
                <span className="hidden sm:inline">Next question</span>
              </button>
              <button
                type="button"
                onClick={explainCurrentQuestion}
                disabled={!canExplain}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
                aria-label="Explain It"
              >
                <span className="sm:hidden">
                  <ExplainIcon />
                </span>
                <span className="hidden sm:inline">Explain It</span>
              </button>
              <button
                type="button"
                onClick={addCurrentQuestionToReviewList}
                disabled={isSavingReviewList || !currentQuestion}
                className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 disabled:opacity-50"
                aria-label="+Review List"
              >
                {isSavingReviewList ? (
                  "Saving..."
                ) : (
                  <>
                    <span className="sm:hidden">
                      <ReviewIcon />
                    </span>
                    <span className="hidden sm:inline">+Review List</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={addCurrentQuestionToDontShowList}
                disabled={isSavingDontShow || !currentQuestion}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 disabled:opacity-50"
                aria-label="Don't Show Again"
              >
                {isSavingDontShow ? (
                  "Saving..."
                ) : (
                  <>
                    <span className="sm:hidden">
                      <HideIcon />
                    </span>
                    <span className="hidden sm:inline">Don&apos;t Show Again</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReportBox((prev) => !prev);
                  setReportStatus("");
                  setReportError("");
                }}
                className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800"
                aria-label="Report"
              >
                <span className="sm:hidden">
                  <ReportIcon />
                </span>
                <span className="hidden sm:inline">Report</span>
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowAdminAsk((prev) => !prev)}
                  className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800"
                  aria-label="Ask AI ( Admin )"
                >
                  <span className="sm:hidden">
                    <AdminAskIcon />
                  </span>
                  <span className="hidden sm:inline">Ask AI ( Admin )</span>
                </button>
              ) : null}
            </div>
            {reviewListStatus ? <p className="mt-2 text-sm text-green-700">{reviewListStatus}</p> : null}
            {reviewListError ? <p className="mt-2 text-sm text-red-600">{reviewListError}</p> : null}
            {dontShowStatus ? <p className="mt-2 text-sm text-green-700">{dontShowStatus}</p> : null}
            {dontShowError ? <p className="mt-2 text-sm text-red-600">{dontShowError}</p> : null}
            {reportStatus ? <p className="mt-2 text-sm text-green-700">{reportStatus}</p> : null}
            {reportError ? <p className="mt-2 text-sm text-red-600">{reportError}</p> : null}

            {showReportBox ? (
              <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-3">
                <p className="text-xs font-medium text-black/70">Report this question</p>
                <textarea
                  value={reportText}
                  onChange={(event) => setReportText(event.target.value)}
                  placeholder="Describe the issue..."
                  maxLength={1000}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
                />
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={submitQuestionReport}
                    disabled={isSubmittingReport || !reportText.trim()}
                    className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            ) : null}

            {answerResult && isLastQuestion ? (
              <p className="mt-3 text-sm text-black/70">
                You reached the end of {selectedLevel || "selected"} questions.
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

            {isAdmin && showAdminAsk ? (
              <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                  Admin free chat
                </p>
                <p className="mt-1 text-sm text-black/70">
                  Uses system prompt from the selected field.
                </p>
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-black/10 bg-black/[0.02] p-3">
                  {adminChatMessages.length === 0 ? (
                    <p className="text-sm text-black/60">No messages yet.</p>
                  ) : (
                    adminChatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-blue-100 text-blue-950"
                            : "border border-black/10 bg-white"
                        }`}
                      >
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-black/55">
                          {message.role === "user" ? "You" : "Assistant"}
                        </p>
                        {message.cached ? (
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Cached
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                    ))
                  )}
                  {isLoadingAdminAsk ? <p className="text-sm text-blue-700">Thinking...</p> : null}
                </div>

                <form onSubmit={submitAdminAsk} className="mt-3 space-y-2">
                  <div className="flex items-end gap-2">
                    <label className="flex min-w-48 flex-col text-xs">
                      <span className="mb-1 font-medium text-black/70">Your language</span>
                      <select
                        value={adminChatLanguage}
                        onChange={(event) =>
                          setAdminChatLanguage(event.target.value as SupportedLanguage)
                        }
                        className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
                        disabled={isLoadingAdminAsk}
                      >
                        {LANGUAGE_OPTIONS.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      ref={adminImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                      disabled={isLoadingAdminAsk}
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setAdminSelectedImage(file);
                      }}
                      className="hidden"
                      id="admin-ask-image-upload"
                    />
                    <label
                      htmlFor="admin-ask-image-upload"
                      className="cursor-pointer rounded-lg border border-black/20 bg-white px-3 py-2 text-xs font-medium text-black transition hover:bg-black/[0.04]"
                    >
                      Choose File
                    </label>
                    <p className="text-xs text-black/60">
                      {adminSelectedImage ? adminSelectedImage.name : "No file selected"}
                    </p>
                  </div>
                  {adminSelectedImage ? (
                    <div className="space-y-2">
                      <p className="text-xs text-black/60">
                        Selected: <strong>{adminSelectedImage.name}</strong> (
                        {Math.ceil(adminSelectedImage.size / 1024)} KB)
                      </p>
                      {adminSelectedImagePreviewUrl ? (
                        <div className="relative w-fit">
                          <Image
                            src={adminSelectedImagePreviewUrl}
                            alt="Selected preview"
                            width={320}
                            height={240}
                            unoptimized
                            className="max-h-40 w-auto rounded-lg border border-black/15"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAdminSelectedImage(null);
                              if (adminImageInputRef.current) {
                                adminImageInputRef.current.value = "";
                              }
                            }}
                            className="mt-2 rounded-md border border-black/20 px-2 py-1 text-xs"
                          >
                            Remove image
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <input
                      value={adminPrompt}
                      onChange={(event) => setAdminPrompt(event.target.value)}
                      onPaste={handleAdminPromptPaste}
                      placeholder="Ask something (optionally with image)..."
                      maxLength={2000}
                      className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                      disabled={isLoadingAdminAsk}
                    />
                    <button
                      type="submit"
                      disabled={isLoadingAdminAsk || (!adminPrompt.trim() && !adminSelectedImage)}
                      className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </form>

                {adminAskError ? <p className="mt-2 text-sm text-red-600">{adminAskError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
