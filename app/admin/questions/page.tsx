import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminQuestionsClient } from "./questions-client";

export default async function AdminQuestionsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminQuestionsClient />;
}
