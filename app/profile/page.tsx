import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Edit Profile</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <ProfileClient
        initialUser={{
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        }}
      />
    </main>
  );
}
