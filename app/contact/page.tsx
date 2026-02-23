import Link from "next/link";

export default function ContactPage() {
  // Keep a clear contact channel in-app for users and partners.
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Contact</h1>
      <p className="mt-3 text-sm text-black/70">
        For support or collaboration, contact:{" "}
        <a href="mailto:hoangbk@example.com" className="text-blue-700 underline">
          hoangbk@example.com
        </a>
      </p>
      <Link href="/" className="mt-5 inline-block text-sm text-blue-700 underline">
        Back to menu
      </Link>
    </main>
  );
}
