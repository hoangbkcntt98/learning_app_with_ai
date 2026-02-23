import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { findQuestionById } from "@/lib/questions";
import { getCurrentAdminUser } from "@/lib/session";

export default async function AdminQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  const routeParams = await params;
  const questionId = Number(routeParams.id);
  if (!Number.isFinite(questionId) || questionId < 1) {
    notFound();
  }

  const question = await findQuestionById(Math.trunc(questionId));
  if (!question) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Question Detail</h1>
        <Link href="/admin/reports" className="text-sm text-blue-700 underline">
          Back to Reports
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-5">
        <p className="text-sm text-black/70">Field: {question.fieldName}</p>
        <p className="text-sm text-black/70">Level: {question.level}</p>
        <h2 className="mt-2 text-lg font-semibold">{question.prompt}</h2>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => (
            <p key={`${question.id}-option-${index}`} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
              {String.fromCharCode(65 + index)}. {option}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
