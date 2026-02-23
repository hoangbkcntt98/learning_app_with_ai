import { redirect } from "next/navigation";
import { FeatureAccessWarning } from "@/app/feature-access-warning";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { listQuestionsFromUserList } from "@/lib/question-lists";
import { getCurrentUser } from "@/lib/session";
import { QuestionListTable } from "../question-list-table";

export default async function ReviewListPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const access = await checkUserFeatureAccess(user, "review");
  if (!access.allowed) {
    return <FeatureAccessWarning title="Feature Restricted" message={access.message} />;
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
