import { FeatureAccessWarning } from "@/app/feature-access-warning";

export default async function FeatureRestrictedPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; title?: string }>;
}) {
  const query = await searchParams;
  const title = String(query.title ?? "Feature Restricted").trim() || "Feature Restricted";
  const message = String(query.message ?? "You do not have access to this feature.").trim()
    || "You do not have access to this feature.";

  return <FeatureAccessWarning title={title} message={message} />;
}

