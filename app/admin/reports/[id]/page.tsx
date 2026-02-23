import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findQuestionReportById } from "@/lib/question-reports";
import { getCurrentAdminUser } from "@/lib/session";

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  const routeParams = await params;
  const reportId = String(routeParams.id ?? "").trim();
  if (!reportId) {
    notFound();
  }

  let report = null;
  try {
    report = await findQuestionReportById(reportId);
  } catch {
    notFound();
  }
  if (!report) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Report Detail</h1>
        <Link href="/admin/reports" className="text-sm text-blue-700 underline">
          Back to Reports
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-5">
        <h2 className="text-base font-semibold">Reporter</h2>
        <p className="mt-1 text-sm">Name: {report.userName}</p>
        <p className="text-sm">Email: {report.userEmail}</p>
      </section>

      <section className="mt-4 rounded-xl border border-black/10 p-5">
        <h2 className="text-base font-semibold">Report content</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm">{report.content}</p>
      </section>

      <section className="mt-4 rounded-xl border border-black/10 p-5">
        <h2 className="text-base font-semibold">Question</h2>
        <p className="mt-1 text-sm">Field: {report.question.fieldName}</p>
        <p className="text-sm">Level: {report.question.level}</p>
        <p className="mt-2 text-sm font-medium">{report.question.prompt}</p>
        <div className="mt-3 grid gap-2">
          {report.question.options.map((option, index) => (
            <p key={`${report.question.id}-option-${index}`} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
              {String.fromCharCode(65 + index)}. {option}
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
