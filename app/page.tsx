import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-8">
      {/* Keep the app logo at the top as the page header branding. */}
      <Image
        src="/images/logo.png"
        alt="BuBu Learning logo"
        width={200}
        height={200}
        className="mb-8 h-[200px] w-[200px] rounded-xl object-cover"
        priority
      />

      <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
        <p className="text-sm text-black/70">
          Signed in as <strong>{user.email}</strong>
        </p>
        <p className="mt-1 text-sm text-black/70">
          Current points: <strong>{user.points}</strong>
        </p>
        <p className="mt-1 text-sm text-black/70">
          Current level: <strong>{user.level}</strong>
        </p>

        <div className="mt-6 rounded-xl border border-black/10 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60">
            Menu
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/play"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              {/* Use a play icon so the button purpose is clear at a glance. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.3-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
              </svg>
              Learning
            </Link>
            <Link
              href="/forum"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              {/* Use a chat bubble icon for forum discussions. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
              </svg>
              Forum
            </Link>
            <Link
              href="/ai-chat"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              {/* Use a spark icon to represent AI assistant actions. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3Z" />
                <path d="M19 15l.95 2.05L22 18l-2.05.95L19 21l-.95-2.05L16 18l2.05-.95L19 15Z" />
              </svg>
              AI Chat
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
                {/* Use a shield icon for admin-only functionality. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 5 6v6c0 5 3.4 8.7 7 10 3.6-1.3 7-5 7-10V6l-7-3Z" />
                </svg>
                Admin
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
