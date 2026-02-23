import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminUsersClient />;
}
