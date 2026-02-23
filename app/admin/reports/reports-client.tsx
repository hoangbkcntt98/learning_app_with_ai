"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingPopup } from "@/app/loading-popup";
import { ActionResultPopup } from "@/app/action-result-popup";

type QuestionReport = {
  id: string;
  userName: string;
  userEmail: string;
  questionId: number;
  fieldName: string;
  level: string;
  prompt: string;
  content: string;
  createdAt: string;
};

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function AdminReportsClient() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [error, setError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    async function loadReports() {
      setError("");
      setLoadingMessage("Loading reports...");
      try {
        const response = await fetch("/api/admin/reports");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Failed to load reports.");
          return;
        }
        const body = (await response.json()) as { reports: QuestionReport[] };
        setReports(body.reports ?? []);
      } catch {
        setError("Failed to load reports.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadReports();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}
      <ActionResultPopup
        isOpen={Boolean(error)}
        message={error}
        tone="error"
        onClose={() => setError("")}
      />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Report management</h1>
        <Link href="/admin" className="text-sm text-blue-700 underline">
          Back to Admin
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Reports</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-black/10">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">User</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Email</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Field</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Level</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Question</th>
                <th className="border-b border-black/10 px-3 py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="border-b border-black/10 px-3 py-2">{report.userName}</td>
                  <td className="border-b border-black/10 px-3 py-2">{report.userEmail}</td>
                  <td className="border-b border-black/10 px-3 py-2">{report.fieldName}</td>
                  <td className="border-b border-black/10 px-3 py-2">{report.level}</td>
                  <td className="border-b border-black/10 px-3 py-2">{report.prompt}</td>
                  <td className="border-b border-black/10 px-3 py-2">
                    <Link
                      href={`/admin/reports/${encodeURIComponent(report.id)}`}
                      className="inline-flex items-center justify-center rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-blue-800"
                      aria-label={`View report ${report.id}`}
                      title="View"
                    >
                      <span className="sm:hidden">
                        <ViewIcon />
                      </span>
                      <span className="hidden sm:inline">View</span>
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-3 text-sm text-black/60">
                    No reports yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
