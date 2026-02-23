"use client";

import { useState } from "react";

export function ReviewNoteEditor({
  questionId,
  initialNote,
  listType,
}: {
  questionId: number;
  initialNote: string;
  listType: "incorrect" | "review";
}) {
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  async function saveNote() {
    setIsSaving(true);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/game/review-notes", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          note,
          type: listType,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Could not save note.");
        return;
      }

      // Show a brief confirmation after successful save.
      setStatus("Note saved.");
    } catch {
      setError("Failed to save note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-black/10 p-5">
      <h3 className="text-base font-semibold">My note</h3>
      <p className="mt-1 text-sm text-black/70">
        Save your reminder for this question.
      </p>

      <button
        type="button"
        onClick={() => setIsEditorOpen((current) => !current)}
        className="mt-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800"
      >
        Add Note
      </button>

      {isEditorOpen ? (
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            maxLength={2000}
            className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            placeholder="Write your note here..."
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={saveNote}
              disabled={isSaving}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSaving ? "Submitting..." : "Submit"}
            </button>
            <span className="text-xs text-black/50">{note.length}/2000</span>
          </div>
        </div>
      ) : null}

      {status ? <p className="mt-2 text-sm text-green-700">{status}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
