import { redirect } from "next/navigation";
import { listQuestionsFromUserList } from "@/lib/question-lists";
import { getCurrentUser } from "@/lib/session";
import { QuestionListTable } from "../question-list-table";

export default async function IncorrectListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Load auto-collected incorrectly answered questions for this user.
  const questions = await listQuestionsFromUserList(user.email, "incorrect");

  return (
    <QuestionListTable
      title="Incorrect List"
      description="Questions are added automatically when your answer is incorrect."
      questions={questions}
      listType="incorrect"
    />
  );
}
