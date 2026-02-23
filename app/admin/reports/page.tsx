import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminReportsClient } from "./reports-client";

export default async function AdminReportsPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminReportsClient />;
}
