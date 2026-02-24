import Link from "next/link";
import { redirect } from "next/navigation";
import { UserSummaryCard, type UserSummary } from "@/app/user-summary-card";
import { getCurrentUser } from "@/lib/session";
import { canUseAiModel } from "@/lib/settings";
import { StoreClient } from "./store-client";

export default async function StorePage() {
  // Render store page for authenticated users only.
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
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <UserSummaryCard user={summaryUser} />

      <div className="mt-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Store</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <p className="mt-2 text-sm text-black/70">
        Buy pets and equip one active pet to get special boosts.
      </p>

      <StoreClient initialGold={user.gold} />
    </main>
  );
}
