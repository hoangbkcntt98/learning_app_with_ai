import Link from "next/link";
import { redirect } from "next/navigation";
import { UserSummaryCard, type UserSummary } from "@/app/user-summary-card";
import { getCurrentUser } from "@/lib/session";
import { canUseAiModel } from "@/lib/settings";
import { ForumClient } from "./forum-client";

export default async function ForumPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const aiQuota = await canUseAiModel(user.email);
  const summaryUser: UserSummary = {
    email: user.email,
    name: user.name,
    segment: user.segment,
    avatarUrl: user.avatarUrl,
    points: user.points,
    gold: user.gold,
    level: user.level,
    aiQuotaRemaining: aiQuota.remaining,
    aiQuotaLimit: aiQuota.limit,
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      <UserSummaryCard user={summaryUser} />

      <div className="mt-6 flex items-center justify-between gap-4">
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
