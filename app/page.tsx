import { redirect } from "next/navigation";
import { checkUserFeatureAccess, getFeatureKeyFromRoutePath } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";
import { canUseAiModel } from "@/lib/settings";
import { HomeDashboard } from "./home-dashboard";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Pre-compute feature availability so homepage tiles can show lock state.
  const [
    learningFeatureKey,
    forumFeatureKey,
    aiChatFeatureKey,
    reviewFeatureKey,
    adminFeatureKey,
    storeFeatureKey,
  ] = [
    getFeatureKeyFromRoutePath("/play"),
    getFeatureKeyFromRoutePath("/forum"),
    getFeatureKeyFromRoutePath("/ai-chat"),
    getFeatureKeyFromRoutePath("/review"),
    getFeatureKeyFromRoutePath("/admin"),
    getFeatureKeyFromRoutePath("/store"),
  ];
  const fallbackAccess = { allowed: true, message: "", rule: null };
  const [learningAccess, forumAccess, aiChatAccess, reviewAccess, adminAccess, storeAccess, aiQuota] = await Promise.all([
    learningFeatureKey ? checkUserFeatureAccess(user, learningFeatureKey) : Promise.resolve(fallbackAccess),
    forumFeatureKey ? checkUserFeatureAccess(user, forumFeatureKey) : Promise.resolve(fallbackAccess),
    aiChatFeatureKey ? checkUserFeatureAccess(user, aiChatFeatureKey) : Promise.resolve(fallbackAccess),
    reviewFeatureKey ? checkUserFeatureAccess(user, reviewFeatureKey) : Promise.resolve(fallbackAccess),
    adminFeatureKey ? checkUserFeatureAccess(user, adminFeatureKey) : Promise.resolve(fallbackAccess),
    storeFeatureKey ? checkUserFeatureAccess(user, storeFeatureKey) : Promise.resolve(fallbackAccess),
    canUseAiModel(user.email),
  ]);

  function buildHowToUnlock(
    access: Awaited<ReturnType<typeof checkUserFeatureAccess>>,
  ) {
    // Build friendly unlock guidance from current feature rule config.
    if (!access.rule) {
      return "";
    }
    const allowedSegments: string[] = [];
    if (access.rule.allowFree) {
      allowedSegments.push("Free");
    }
    if (access.rule.allowPlus) {
      allowedSegments.push("Plus");
    }
    if (access.rule.allowPro) {
      allowedSegments.push("Pro");
    }
    if (access.rule.allowPremium) {
      allowedSegments.push("Premium");
    }

    const parts: string[] = [];
    if (allowedSegments.length > 0) {
      parts.push(`Allowed segments: ${allowedSegments.join(", ")}.`);
    }
    if (access.rule.minLevel > 0) {
      parts.push(`Required level: ${access.rule.minLevel}+.`);
      parts.push("Keep answering Learning questions correctly to raise your level.");
    }
    return parts.join(" ");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-8">
      <HomeDashboard
        initialUser={{
          ...user,
          aiQuotaRemaining: aiQuota.remaining,
          aiQuotaLimit: aiQuota.limit,
        }}
        featureAccess={{
          learning: {
            allowed: learningAccess.allowed,
            message: learningAccess.message,
            howTo: buildHowToUnlock(learningAccess),
          },
          forum: {
            allowed: forumAccess.allowed,
            message: forumAccess.message,
            howTo: buildHowToUnlock(forumAccess),
          },
          aiChat: {
            allowed: aiChatAccess.allowed,
            message: aiChatAccess.message,
            howTo: buildHowToUnlock(aiChatAccess),
          },
          review: {
            allowed: reviewAccess.allowed,
            message: reviewAccess.message,
            howTo: buildHowToUnlock(reviewAccess),
          },
          admin: {
            allowed: adminAccess.allowed,
            message: adminAccess.message,
            howTo: buildHowToUnlock(adminAccess),
          },
          store: {
            allowed: storeAccess.allowed,
            message: storeAccess.message,
            howTo: buildHowToUnlock(storeAccess),
          },
        }}
      />
    </main>
  );
}
