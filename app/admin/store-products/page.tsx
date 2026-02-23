import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/session";
import { AdminStoreProductsClient } from "./store-products-client";

export default async function AdminStoreProductsPage() {
  // Restrict store management route to admin users.
  const admin = await getCurrentAdminUser();
  if (!admin) {
    redirect("/");
  }

  return <AdminStoreProductsClient />;
}
