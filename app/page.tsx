import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HomeDashboard } from "./home-dashboard";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-8">
      {/* Keep the app logo at the top as the page header branding. */}
      <Image
        src="/images/logo.png"
        alt="BuBu Learning logo"
        width={200}
        height={200}
        className="mb-8 h-[200px] w-[200px] rounded-xl object-cover"
        priority
      />

      <HomeDashboard initialUser={user} />
    </main>
  );
}
