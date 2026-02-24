import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasQuestionInUserList } from "@/lib/question-lists";
import { getUserQuestionNote } from "@/lib/question-notes";
import { findQuestionById } from "@/lib/questions";
import { getCurrentUser } from "@/lib/session";
import { QuestionAskAi } from "./question-ask-ai";
import { ReviewNoteEditor } from "./review-note-editor";

export default async function ReviewQuestionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listType?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const routeParams = await params;
  const questionId = Number(routeParams.id);
  if (!Number.isFinite(questionId) || questionId < 1) {
    notFound();
  }

  // Load a single question for the detail view linked from list table actions.
  const question = await findQuestionById(Math.trunc(questionId));
  if (!question) {
    notFound();
  }

  const query = await searchParams;
  const rawListType = String(query.listType ?? "").trim().toLowerCase();
  const selectedListType =
    rawListType === "review" || rawListType === "incorrect" ? rawListType : null;
  const canShowNoteEditor = selectedListType
    ? await hasQuestionInUserList(user.email, question.id, selectedListType)
    : false;
  const initialNote = canShowNoteEditor
    ? await getUserQuestionNote(user.email, question.id)
    : "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Question Detail</h1>
        <Link href="/review" className="text-sm text-blue-700 underline">
          Back to Review
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-5">
        <p className="text-xs uppercase tracking-wide text-black/60">{question.level}</p>
        <h2 className="mt-2 text-lg font-semibold">{question.prompt}</h2>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => (
            <p key={`${question.id}-option-${index}`} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
              {String.fromCharCode(65 + index)}. {option}
            </p>
          ))}
        </div>
      </div>

      <QuestionAskAi prompt={question.prompt} options={question.options} fieldId={question.fieldId} />

      {canShowNoteEditor && selectedListType ? (
        <ReviewNoteEditor
          questionId={question.id}
          initialNote={initialNote}
          listType={selectedListType}
        />
      ) : null}
    </main>
  );
}
