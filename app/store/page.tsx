import Link from "next/link";
import { redirect } from "next/navigation";
import { UserSummaryCard } from "@/app/user-summary-card";
import { getCurrentUser } from "@/lib/session";
import { StoreClient } from "./store-client";

export default async function StorePage() {
  // Render store page for authenticated users only.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8">
      <UserSummaryCard
        user={{
          email: user.email,
          name: user.name,
          segment: user.segment,
          avatarUrl: user.avatarUrl,
          points: user.points,
          gold: user.gold,
          level: user.level,
        }}
      />

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
