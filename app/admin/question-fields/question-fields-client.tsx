"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "@/app/loading-popup";
import { ActionResultPopup } from "@/app/action-result-popup";

type QuestionField = {
  id: number;
  key: string;
  name: string;
  systemPrompt: string;
  explanationPromptTemplate: string;
};

export function AdminQuestionFieldsClient() {
  const [fields, setFields] = useState<QuestionField[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [newField, setNewField] = useState({
    key: "",
    name: "",
    systemPrompt: "",
    explanationPromptTemplate: "",
  });
  const [editingField, setEditingField] = useState<QuestionField | null>(null);
  const [deletingField, setDeletingField] = useState<QuestionField | null>(null);

  const filtered = useMemo(() => {
    // Filter rows by key/name search text.
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) {
      return fields;
    }
    return fields.filter(
      (field) =>
        field.name.toLowerCase().includes(keyword) || field.key.toLowerCase().includes(keyword),
    );
  }, [fields, searchTerm]);

  useEffect(() => {
    async function loadFields() {
      setError("");
      setLoadingMessage("Loading question fields...");
      try {
        const response = await fetch("/api/admin/question-fields");
        if (!response.ok) {
          setError("Failed to load question fields.");
          return;
        }
        const body = (await response.json()) as { fields: QuestionField[] };
        setFields(body.fields ?? []);
      } catch {
        setError("Failed to load question fields.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadFields();
  }, []);

  async function createField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Creating question field...");
    try {
      const response = await fetch("/api/admin/question-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newField.key.trim().toLowerCase(),
          name: newField.name.trim(),
          systemPrompt: newField.systemPrompt,
          explanationPromptTemplate: newField.explanationPromptTemplate,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create field.");
        return;
      }
      const body = (await response.json()) as { field: QuestionField };
      setFields((prev) => [...prev, body.field]);
      setNewField({ key: "", name: "", systemPrompt: "", explanationPromptTemplate: "" });
      setStatus("Question field created.");
    } catch {
      setError("Failed to create field.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function saveEditingField() {
    if (!editingField) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving field ${editingField.id}...`);
    try {
      const response = await fetch(`/api/admin/question-fields/${encodeURIComponent(editingField.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: editingField.key.trim().toLowerCase(),
          name: editingField.name.trim(),
          systemPrompt: editingField.systemPrompt,
          explanationPromptTemplate: editingField.explanationPromptTemplate,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update field.");
        return;
      }
      const body = (await response.json()) as { field: QuestionField };
      setFields((prev) => prev.map((item) => (item.id === body.field.id ? body.field : item)));
      setEditingField(null);
      setStatus("Question field updated.");
    } catch {
      setError("Failed to update field.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function confirmDeleteField() {
    if (!deletingField) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Deleting field ${deletingField.name}...`);
    try {
      const response = await fetch(`/api/admin/question-fields/${encodeURIComponent(deletingField.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete field.");
        return;
      }
      setFields((prev) => prev.filter((item) => item.id !== deletingField.id));
      setDeletingField(null);
      setStatus("Question field deleted.");
    } catch {
      setError("Failed to delete field.");
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
        <h1 className="text-2xl font-semibold">Question Field Management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create field</h2>
        <form onSubmit={createField} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            required
            placeholder="Key (e.g. aws)"
            value={newField.key}
            onChange={(event) => setNewField((prev) => ({ ...prev, key: event.target.value }))}
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="Name (e.g. AWS)"
            value={newField.name}
            onChange={(event) => setNewField((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-black/20 px-3 py-2 text-sm"
          />
          <textarea
            value={newField.systemPrompt}
            onChange={(event) =>
              setNewField((prev) => ({ ...prev, systemPrompt: event.target.value }))
            }
            placeholder="System prompt for this field (optional)"
            className="rounded-lg border border-black/20 px-3 py-2 text-sm md:col-span-3"
            rows={4}
          />
          <textarea
            value={newField.explanationPromptTemplate}
            onChange={(event) =>
              setNewField((prev) => ({ ...prev, explanationPromptTemplate: event.target.value }))
            }
            placeholder="Explanation prompt template for Learning Ask AI (optional)"
            className="rounded-lg border border-black/20 px-3 py-2 text-sm md:col-span-3"
            rows={5}
          />
          <p className="text-xs text-black/60 md:col-span-3">
            Supported variables: {"{{question}}"}, {"{{selectedLabel}}"}, {"{{selectedOption}}"},
            {" {{correctLabel}}"}, {"{{correctOption}}"}, {"{{allOptions}}"}, {"{{language}}"},
            {" {{resultStateText}}"}, {"{{explanationInstruction}}"}.
          </p>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">Create</button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Fields</h2>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by key or name"
          className="mt-3 w-full rounded-lg border border-black/20 px-3 py-2 text-sm md:max-w-sm"
        />
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">ID</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Key</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Name</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">System prompt</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Explanation template</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((field) => (
                <tr key={field.id}>
                  <td className="border-b border-black/10 px-3 py-2">{field.id}</td>
                  <td className="border-b border-black/10 px-3 py-2">{field.key}</td>
                  <td className="border-b border-black/10 px-3 py-2">{field.name}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    {field.systemPrompt ? (
                      <p className="max-w-md truncate">{field.systemPrompt}</p>
                    ) : (
                      <span className="text-black/50">-</span>
                    )}
                  </td>
                  <td className="border-b border-black/10 px-3 py-2">
                    {field.explanationPromptTemplate ? (
                      <p className="max-w-md truncate">{field.explanationPromptTemplate}</p>
                    ) : (
                      <span className="text-black/50">-</span>
                    )}
                  </td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingField({ ...field })}
                        className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-800"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingField(field)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-sm text-rose-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm text-black/60">
                    No fields found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingField ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card w-[min(92vw,820px)]">
            <p className="text-base font-semibold">Edit field</p>
            <input
              value={editingField.key}
              onChange={(event) =>
                setEditingField((prev) => (prev ? { ...prev, key: event.target.value } : prev))
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <input
              value={editingField.name}
              onChange={(event) =>
                setEditingField((prev) => (prev ? { ...prev, name: event.target.value } : prev))
              }
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
            />
            <textarea
              value={editingField.systemPrompt}
              onChange={(event) =>
                setEditingField((prev) =>
                  prev ? { ...prev, systemPrompt: event.target.value } : prev,
                )
              }
              placeholder="System prompt for this field (optional)"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
              rows={5}
            />
            <textarea
              value={editingField.explanationPromptTemplate}
              onChange={(event) =>
                setEditingField((prev) =>
                  prev ? { ...prev, explanationPromptTemplate: event.target.value } : prev,
                )
              }
              placeholder="Explanation prompt template for Learning Ask AI (optional)"
              className="w-full rounded border border-black/20 px-2 py-1 text-sm"
              rows={6}
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={saveEditingField}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingField ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[320px]">
            <p className="text-base font-semibold text-rose-700">
              Delete field {deletingField.name}?
            </p>
            <p className="text-sm text-black/70">This action cannot be undone.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDeletingField(null)}
                className="rounded-lg border border-black/20 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteField}
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
