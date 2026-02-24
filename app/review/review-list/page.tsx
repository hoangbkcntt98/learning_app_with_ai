import { redirect } from "next/navigation";
import { listQuestionsFromUserList } from "@/lib/question-lists";
import { getCurrentUser } from "@/lib/session";
import { QuestionListTable } from "../question-list-table";

export default async function ReviewListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Load user-marked questions from the manual review list.
  const questions = await listQuestionsFromUserList(user.email, "review");

  return (
    <QuestionListTable
      title="Review List"
      description='Questions are added when you click "+Review List" during Learning.'
      questions={questions}
      listType="review"
    />
  );
}
