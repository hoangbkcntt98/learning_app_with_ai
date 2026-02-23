import Link from "next/link";

export default function AboutPage() {
  // Provide a lightweight informational page for footer navigation.
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">About BuBu Learning</h1>
      <p className="mt-3 text-sm text-black/70">
        BuBu Learning helps users practice Japanese through Learning games, community Forum, and AI Chat support.
      </p>
      <Link href="/" className="mt-5 inline-block text-sm text-blue-700 underline">
        Back to menu
      </Link>
    </main>
  );
}
