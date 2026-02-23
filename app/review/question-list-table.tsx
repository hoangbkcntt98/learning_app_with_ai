"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ListType = "incorrect" | "review";

type ListQuestion = {
  id: number;
  level: string;
  prompt: string;
  options: [string, string, string, string];
};

function ConfirmDeletePopup({
  isOpen,
  questionPrompt,
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  isOpen: boolean;
  questionPrompt: string;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="loading-popup-overlay" role="dialog" aria-modal="true">
      <div className="loading-popup-card min-w-[280px]">
        {/* Shared confirmation popup style for delete action. */}
        <p className="text-base font-semibold text-rose-700">Delete this question from the list?</p>
        <p className="max-w-sm text-sm text-black/70">{questionPrompt}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionListTable({
  title,
  description,
  questions,
  listType,
}: {
  title: string;
  description: string;
  questions: ListQuestion[];
  listType: ListType;
}) {
  const [items, setItems] = useState(questions);
  const [error, setError] = useState("");
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const pendingDeleteQuestion = useMemo(
    () => items.find((item) => item.id === pendingDeleteId) ?? null,
    [items, pendingDeleteId],
  );

  async function confirmDelete() {
    if (pendingDeleteId === null) {
      return;
    }

    setError("");
    setDeletingQuestionId(pendingDeleteId);

    try {
      const response = await fetch("/api/game/lists", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: pendingDeleteId,
          type: listType,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not delete question from list.");
        return;
      }

      // Remove deleted question from UI without full page refresh.
      setItems((current) => current.filter((item) => item.id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch {
      setError("Failed to delete question from list.");
    } finally {
      setDeletingQuestionId(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <ConfirmDeletePopup
        isOpen={pendingDeleteId !== null}
        questionPrompt={pendingDeleteQuestion?.prompt ?? ""}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        isSubmitting={deletingQuestionId !== null}
      />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link href="/review" className="text-sm text-blue-700 underline">
          Back to Review
        </Link>
      </div>

      <p className="mt-2 text-sm text-black/70">{description}</p>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-black/10 p-4 text-sm text-black/70">
          No questions yet.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/10">
          {/* Keep only requested columns and add actions for manage/view flow. */}
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">#</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">JLPT</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Question</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((question, index) => (
                <tr key={`${question.id}-${index}`} className="align-top">
                  <td className="border-b border-black/10 px-3 py-2">{index + 1}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.level}</td>
                  <td className="border-b border-black/10 px-3 py-2">{question.prompt}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/review/question/${question.id}?listType=${listType}`}
                        className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-blue-800"
                      >
                        {/* On mobile show icon only, on desktop show text. */}
                        <span className="sm:hidden" aria-label="View">
                          👁
                        </span>
                        <span className="hidden sm:inline">View</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(question.id)}
                        disabled={deletingQuestionId !== null}
                        className="inline-flex items-center justify-center rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-rose-800 disabled:opacity-50"
                      >
                        {/* On mobile show icon only, on desktop show text. */}
                        <span className="sm:hidden" aria-label="Delete">
                          🗑
                        </span>
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
