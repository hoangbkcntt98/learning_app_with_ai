import { redirect } from "next/navigation";
import { FeatureAccessWarning } from "@/app/feature-access-warning";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
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

  return <GameClient initialPoints={user.points} initialLevel={user.level} />;
}
