import Link from "next/link";
import { redirect } from "next/navigation";
import { FeatureAccessWarning } from "@/app/feature-access-warning";
import { UserSummaryCard } from "@/app/user-summary-card";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import { ForumClient } from "./forum-client";

export default async function ForumPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const access = await checkUserFeatureAccess(user, "forum");
  if (!access.allowed) {
    return <FeatureAccessWarning title="Feature Restricted" message={access.message} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
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
