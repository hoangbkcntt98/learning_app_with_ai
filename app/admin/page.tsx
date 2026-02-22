import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminClient />;
}
