import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminQuestionLevelsClient } from "./question-levels-client";

export default async function AdminQuestionLevelsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminQuestionLevelsClient />;
}
