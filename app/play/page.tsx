import { redirect } from "next/navigation";
import { FeatureAccessWarning } from "@/app/feature-access-warning";
import type { UserSummary } from "@/app/user-summary-card";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import { canUseAiModel } from "@/lib/settings";
import { GameClient } from "./game-client";

export default async function PlayPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const access = await checkUserFeatureAccess(user, "learning");
  if (!access.allowed) {
    return <FeatureAccessWarning title="Feature Restricted" message={access.message} />;
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
    <GameClient
      initialPoints={user.points}
      initialGold={user.gold}
      initialLevel={user.level}
      isAdmin={user.role === "admin"}
      summaryUser={summaryUser}
    />
  );
}
