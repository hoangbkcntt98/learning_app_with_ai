"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "@/app/loading-popup";
import { ActionResultPopup } from "@/app/action-result-popup";

type QuestionField = {
  id: number;
  key: string;
  name: string;
};

type QuestionLevel = {
  id: number;
  questionFieldId: number;
  fieldName: string;
  name: string;
};

export function AdminQuestionLevelsClient() {
  const [fields, setFields] = useState<QuestionField[]>([]);
  const [levels, setLevels] = useState<QuestionLevel[]>([]);
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [newLevel, setNewLevel] = useState({
    questionFieldId: 1,
    name: "",
  });
  const [editingLevel, setEditingLevel] = useState<QuestionLevel | null>(null);
  const [deletingLevel, setDeletingLevel] = useState<QuestionLevel | null>(null);

  const filteredLevels = useMemo(() => {
    // Filter level rows by selected field and text search.
    const keyword = searchTerm.trim().toLowerCase();
    return levels.filter((level) => {
      const matchesField =
        fieldFilter === "all" ? true : String(level.questionFieldId) === fieldFilter;
      const matchesSearch = keyword
        ? level.name.toLowerCase().includes(keyword) || level.fieldName.toLowerCase().includes(keyword)
        : true;
      return matchesField && matchesSearch;
    });
  }, [levels, fieldFilter, searchTerm]);

  useEffect(() => {
    async function loadData() {
      setError("");
      setLoadingMessage("Loading question levels...");
      try {
        const [fieldsResponse, levelsResponse] = await Promise.all([
          fetch("/api/admin/question-fields"),
          fetch("/api/admin/question-levels"),
        ]);
        if (!fieldsResponse.ok || !levelsResponse.ok) {
          setError("Failed to load question levels.");
          return;
        }

        const fieldsBody = (await fieldsResponse.json()) as { fields: QuestionField[] };
        const levelsBody = (await levelsResponse.json()) as { levels: QuestionLevel[] };
        const nextFields = fieldsBody.fields ?? [];
        setFields(nextFields);
        setLevels(levelsBody.levels ?? []);
        if (nextFields.length > 0) {
          setNewLevel((prev) => ({ ...prev, questionFieldId: nextFields[0].id }));
        }
      } catch {
        setError("Failed to load question levels.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadData();
  }, []);

  async function createLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating question level...");
    try {
      const response = await fetch("/api/admin/question-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionFieldId: newLevel.questionFieldId,
          name: newLevel.name.trim(),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create level.");
        return;
      }

      const body = (await response.json()) as { level: QuestionLevel };
      setLevels((prev) => [...prev, body.level]);
      setNewLevel((prev) => ({ ...prev, name: "" }));
      setStatus("Question level created.");
    } catch {
      setError("Failed to create level.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveLevel() {
    if (!editingLevel) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving level ${editingLevel.id}...`);
    try {
      const response = await fetch(`/api/admin/question-levels/${encodeURIComponent(editingLevel.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionFieldId: editingLevel.questionFieldId,
          name: editingLevel.name.trim(),
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update level.");
        return;
      }
      const body = (await response.json()) as { level: QuestionLevel };
      setLevels((prev) => prev.map((item) => (item.id === body.level.id ? body.level : item)));
      setEditingLevel(null);
      setStatus("Question level updated.");
    } catch {
      setError("Failed to update level.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function deleteLevel() {
    if (!deletingLevel) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Deleting level ${deletingLevel.name}...`);
    try {
      const response = await fetch(`/api/admin/question-levels/${encodeURIComponent(deletingLevel.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete level.");
        return;
      }
      setLevels((prev) => prev.filter((item) => item.id !== deletingLevel.id));
      setDeletingLevel(null);
      setStatus("Question level deleted.");
    } catch {
      setError("Failed to delete level.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}
      <ActionResultPopup
        isOpen={Boolean(error || status)}
        message={error || status}
        tone={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setStatus("");
        }}
      />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Question Level Management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create level</h2>
        <form onSubmit={createLevel} className="mt-3 grid gap-3 md:grid-cols-3">
          <select
            value={newLevel.questionFieldId}
            onChange={(event) =>
              setNewLevel((prev) => ({
                ...prev,
                questionFieldId: Number.parseInt(event.target.value || "1", 10),
              }))
            }
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          >
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          <input
            required
            value={newLevel.name}
            onChange={(event) =>
              setNewLevel((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            placeholder="Level name"
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Levels</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by field or level"
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          />
          <select
            value={fieldFilter}
            onChange={(event) => setFieldFilter(event.target.value)}
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          >
            <option value="all">All fields</option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">ID</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Field</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Level</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLevels.map((level) => (
                <tr key={level.id}>
                  <td className="border-b border-black/10 px-3 py-2">{level.id}</td>
                  <td className="border-b border-black/10 px-3 py-2">{level.fieldName}</td>
                  <td className="border-b border-black/10 px-3 py-2">{level.name}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingLevel({ ...level })}
                        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLevel(level)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-sm text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLevels.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm text-black/60">
                    No levels found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingLevel ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            <p className="text-base font-semibold">Edit level</p>
            <select
              value={editingLevel.questionFieldId}
              onChange={(event) =>
                setEditingLevel((prev) =>
                  prev
                    ? {
                        ...prev,
                        questionFieldId: Number.parseInt(event.target.value || "1", 10),
                      }
                    : prev,
                )
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            >
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <input
              value={editingLevel.name}
              onChange={(event) =>
                setEditingLevel((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={saveLevel}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingLevel(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingLevel ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            <p className="text-base font-semibold text-rose-700">
              Delete level {deletingLevel.name}?
            </p>
            <p className="text-sm text-black/70">This action cannot be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingLevel(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteLevel}
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
