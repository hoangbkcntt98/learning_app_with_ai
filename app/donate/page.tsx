import Link from "next/link";

export default function DonatePage() {
  // Keep donation instructions simple until payment integration is added.
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Donate</h1>
      <p className="mt-3 text-sm text-black/70">
        Thank you for supporting BuBu Learning. Donation setup is coming soon.
      </p>
      <Link href="/" className="mt-5 inline-block text-sm text-blue-700 underline">
        Back to menu
      </Link>
    </main>
  );
}
