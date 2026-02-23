import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminQuestionFieldsClient } from "./question-fields-client";

export default async function AdminQuestionFieldsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminQuestionFieldsClient />;
}
