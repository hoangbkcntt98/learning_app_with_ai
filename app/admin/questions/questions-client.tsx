"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "@/app/loading-popup";

type Question = {
  id: number;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function ActionButton({
  onClick,
  tone,
  text,
  icon,
}: {
  onClick: () => void;
  tone: "view" | "edit" | "delete";
  text: string;
  icon: ReactNode;
}) {
  const toneClass =
    tone === "view"
      ? "border-blue-300 bg-blue-50 text-blue-800"
      : tone === "edit"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-rose-300 bg-rose-50 text-rose-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1.5 text-sm ${toneClass}`}
    >
      {/* Show icon on mobile and text on larger screens. */}
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline">{text}</span>
    </button>
  );
}

export function AdminQuestionsClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    level: "N5" as "N5" | "N4" | "N3" | "N2" | "N1",
    prompt: "",
    options: ["", "", "", ""] as [string, string, string, string],
    correctIndex: 0,
  });
  const [selectedQuestionView, setSelectedQuestionView] = useState<Question | null>(null);
  const [selectedQuestionEdit, setSelectedQuestionEdit] = useState<Question | null>(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "N5" | "N4" | "N3" | "N2" | "N1">("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const filteredQuestions = useMemo(() => {
    // Filter question rows by prompt/id search and JLPT level.
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return questions.filter((question) => {
      const matchesLevel = levelFilter === "all" ? true : question.level === levelFilter;
      const matchesSearch = normalizedSearch
        ? question.prompt.toLowerCase().includes(normalizedSearch) ||
          String(question.id).includes(normalizedSearch)
        : true;
      return matchesLevel && matchesSearch;
    });
  }, [questions, searchTerm, levelFilter]);

  useEffect(() => {
    async function loadQuestions() {
      setError("");
      setLoadingMessage("Loading questions...");
      try {
        const response = await fetch("/api/admin/questions");
        if (!response.ok) {
          setError("Failed to load questions.");
          return;
        }
        const body = (await response.json()) as { questions: Question[] };
        setQuestions(body.questions ?? []);
      } catch {
        setError("Failed to load questions.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadQuestions();
  }, []);

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating question...");
    try {
      const response = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create question.");
        return;
      }
      const body = (await response.json()) as { question: Question };
      setQuestions((prev) => [...prev, body.question]);
      setStatus("Question created.");
      setNewQuestion({
        level: "N5",
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      });
    } catch {
      setError("Failed to create question.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveSelectedQuestion() {
    if (!selectedQuestionEdit) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving question ${selectedQuestionEdit.id}...`);
    try {
      const response = await fetch(`/api/admin/questions/${encodeURIComponent(selectedQuestionEdit.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: selectedQuestionEdit.level,
          prompt: selectedQuestionEdit.prompt,
          options: selectedQuestionEdit.options,
          correctIndex: selectedQuestionEdit.correctIndex,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update question.");
        return;
      }
      const body = (await response.json()) as { question: Question };
      setQuestions((prev) => prev.map((item) => (item.id === body.question.id ? body.question : item)));
      setSelectedQuestionEdit(null);
      setStatus(`Updated question ${body.question.id}.`);
    } catch {
      setError("Failed to update question.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function confirmDeleteQuestion() {
    if (deleteQuestionId === null) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Deleting question ${deleteQuestionId}...`);
    try {
      const response = await fetch(`/api/admin/questions/${encodeURIComponent(deleteQuestionId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete question.");
        return;
      }
      setQuestions((prev) => prev.filter((item) => item.id !== deleteQuestionId));
      setDeleteQuestionId(null);
      setStatus("Question deleted.");
    } catch {
      setError("Failed to delete question.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Question management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-green-700">{status}</p> : null}

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create question</h2>
        <form onSubmit={createQuestion} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/70">JLPT level</span>
              <select
                value={newQuestion.level}
                onChange={(event) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    level: event.target.value as "N5" | "N4" | "N3" | "N2" | "N1",
                  }))
                }
                className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              >
                <option value="N5">N5</option>
                <option value="N4">N4</option>
                <option value="N3">N3</option>
                <option value="N2">N2</option>
                <option value="N1">N1</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/70">Correct answer index</span>
              <select
                value={newQuestion.correctIndex}
                onChange={(event) =>
                  setNewQuestion((prev) => ({
                    ...prev,
                    correctIndex: Number.parseInt(event.target.value || "0", 10),
                  }))
                }
                className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              >
                {/* Use answer labels so admins do not need to map index numbers manually. */}
                <option value={0}>Answer 1</option>
                <option value={1}>Answer 2</option>
                <option value={2}>Answer 3</option>
                <option value={3}>Answer 4</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Question</span>
            <input
              required
              value={newQuestion.prompt}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, prompt: event.target.value }))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            {newQuestion.options.map((option, index) => (
              <label key={`new-option-${index}`} className="block">
                <span className="mb-1 block text-xs font-medium text-black/70">Answer {index + 1}</span>
                <input
                  required
                  value={option}
                  onChange={(event) =>
                    setNewQuestion((prev) => {
                      const next = [...prev.options] as [string, string, string, string];
                      next[index] = event.target.value;
                      return { ...prev, options: next };
                    })
                  }
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Questions</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/70">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by ID or prompt"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">JLPT filter</span>
            <select
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(event.target.value as "all" | "N5" | "N4" | "N3" | "N2" | "N1")
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              <option value="all">All levels</option>
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </select>
          </label>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">ID</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">JLPT</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Question</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Answer 1</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Answer 2</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Answer 3</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Answer 4</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Correct Answer</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((question) => (
                <tr key={question.id}>
                  <td className="border-b border-black/10 px-3 py-2">{question.id}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.level}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.prompt}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.options[0]}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.options[1]}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.options[2]}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.options[3]}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    {`Answer ${question.correctIndex + 1}`}
                  </td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <ActionButton tone="view" text="View" icon={<ViewIcon />} onClick={() => setSelectedQuestionView(question)} />
                      <ActionButton tone="edit" text="Edit" icon={<EditIcon />} onClick={() => setSelectedQuestionEdit({ ...question })} />
                      <ActionButton tone="delete" text="Delete" icon={<DeleteIcon />} onClick={() => setDeleteQuestionId(question.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-black/60" colSpan={9}>
                    No questions found for current search/filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedQuestionView ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            {/* Show question details in a read-only popup. */}
            <p className="text-base font-semibold">Question detail</p>
            <p className="text-sm">ID: {selectedQuestionView.id}</p>
            <p className="text-sm">JLPT: {selectedQuestionView.level}</p>
            <p className="text-sm">Question: {selectedQuestionView.prompt}</p>
            <p className="text-sm">A. {selectedQuestionView.options[0]}</p>
            <p className="text-sm">B. {selectedQuestionView.options[1]}</p>
            <p className="text-sm">C. {selectedQuestionView.options[2]}</p>
            <p className="text-sm">D. {selectedQuestionView.options[3]}</p>
            <p className="text-sm">Correct index: {selectedQuestionView.correctIndex}</p>
            <button
              type="button"
              onClick={() => setSelectedQuestionView(null)}
              className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {selectedQuestionEdit ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[360px]">
            {/* Edit selected question fields before saving changes. */}
            <p className="text-base font-semibold">Edit question</p>
            <select
              value={selectedQuestionEdit.level}
              onChange={(event) =>
                setSelectedQuestionEdit((prev) =>
                  prev
                    ? { ...prev, level: event.target.value as "N5" | "N4" | "N3" | "N2" | "N1" }
                    : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </select>
            <input
              value={selectedQuestionEdit.prompt}
              onChange={(event) =>
                setSelectedQuestionEdit((prev) => (prev ? { ...prev, prompt: event.target.value } : prev))
              }
              placeholder="Question"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            {selectedQuestionEdit.options.map((option, optionIndex) => (
              <input
                key={`${selectedQuestionEdit.id}-option-${optionIndex}`}
                value={option}
                onChange={(event) =>
                  setSelectedQuestionEdit((prev) => {
                    if (!prev) {
                      return prev;
                    }
                    const nextOptions = [...prev.options] as [string, string, string, string];
                    nextOptions[optionIndex] = event.target.value;
                    return { ...prev, options: nextOptions };
                  })
                }
                placeholder={`Answer ${optionIndex + 1}`}
                className="w-full rounded border border-black/20 px-2 py-1 text-sm"
              />
            ))}
            <select
              value={selectedQuestionEdit.correctIndex}
              onChange={(event) =>
                setSelectedQuestionEdit((prev) =>
                  prev ? { ...prev, correctIndex: Number.parseInt(event.target.value || "0", 10) } : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              {/* Keep the same answer label options in edit mode. */}
              <option value={0}>Answer 1</option>
              <option value={1}>Answer 2</option>
              <option value={2}>Answer 3</option>
              <option value={3}>Answer 4</option>
            </select>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={saveSelectedQuestion}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuestionEdit(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteQuestionId !== null ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Confirm question delete action. */}
            <p className="text-base font-semibold text-rose-700">Delete question {deleteQuestionId}?</p>
            <p className="text-sm text-black/70">This action cannot be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteQuestionId(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteQuestion}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
