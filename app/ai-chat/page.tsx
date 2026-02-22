import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ChatBox } from "../chat-box";

export default async function AiChatPage() {
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
        <h1 className="text-2xl font-semibold">AI Chat</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <p className="mt-2 text-sm text-black/70">
        Ask about Japanese words, grammar, and practice questions.
      </p>

      <ChatBox />
    </main>
  );
}
