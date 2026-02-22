import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ForumClient } from "./forum-client";

export default async function ForumPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      {/* Show app panda logo on this user route for consistent branding. */}
      <div className="mb-5 flex justify-center">
        <Image
          src="/images/logo.png"
          alt="BuBu Learning panda logo"
          width={112}
          height={112}
          className="h-28 w-28 rounded-xl object-cover"
          priority
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Forum</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <p className="mt-2 text-sm text-black/70">
        Share your progress and discuss questions with other players.
      </p>

      <ForumClient currentUserEmail={user.email} />
    </main>
  );
}
