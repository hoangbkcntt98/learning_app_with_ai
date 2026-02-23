import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeatureAccessWarning } from "@/app/feature-access-warning";
import { checkUserFeatureAccess } from "@/lib/feature-access";
import { getCurrentUser } from "@/lib/session";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const access = await checkUserFeatureAccess(user, "review");
  if (!access.allowed) {
    return <FeatureAccessWarning title="Feature Restricted" message={access.message} />;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-8">
      {/* Keep top feature image style aligned with other feature routes. */}
      <div className="mb-5 flex justify-center">
        <Image
          src="/images/review.png"
          alt="Review feature"
          width={112}
          height={112}
          className="h-28 w-28 rounded-xl object-cover"
          priority
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Review</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <p className="mt-2 text-sm text-black/70">
        Open your saved questions for focused practice.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/review/incorrect-list"
          className="inline-flex items-center justify-center rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
        >
          Incorrect List
        </Link>
        <Link
          href="/review/review-list"
          className="inline-flex items-center justify-center rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800"
        >
          Review List
        </Link>
      </div>
    </main>
  );
}
