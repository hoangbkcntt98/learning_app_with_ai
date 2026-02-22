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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Japanese Game</h1>
        <p className="mt-2 text-sm text-black/70">
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
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Play game
            </Link>
            <Link
              href="/forum"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
            >
              Forum
            </Link>
            <Link
              href="/ai-chat"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              AI Chat
            </Link>
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              >
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
