"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { LogoutButton } from "./logout-button";

type HomeUser = {
  email: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  level: number;
  role: "admin" | "user";
};

function computeLevelProgress(points: number, level: number) {
  // Compute progress to next level using existing powers-of-10 thresholds.
  if (level <= 0) {
    const min = 0;
    const max = 10;
    const clampedPoints = Math.max(min, Math.min(points, max));
    const ratio = (clampedPoints - min) / (max - min);
    return {
      percent: Math.round(ratio * 100),
      currentTarget: `${clampedPoints}/${max}`,
    };
  }

  const min = 10 ** level;
  const max = 10 ** (level + 1);
  const clampedPoints = Math.max(min, Math.min(points, max));
  const ratio = (clampedPoints - min) / (max - min);
  return {
    percent: Math.round(ratio * 100),
    currentTarget: `${clampedPoints}/${max}`,
  };
}

function getInitialLetter(name: string, email: string) {
  // Build a simple fallback avatar label when no image is available.
  const source = name.trim() || email.trim();
  return source ? source[0].toUpperCase() : "U";
}

export function HomeDashboard({ initialUser }: { initialUser: HomeUser }) {
  const user = initialUser;
  const levelProgress = useMemo(
    () => computeLevelProgress(user.points, user.level),
    [user.points, user.level],
  );

  return (
    <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex flex-col items-center">
          {/* Show user avatar with circular border as requested. */}
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-black/25 bg-black/5 md:h-24 md:w-24">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={`${user.name} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xl font-semibold text-black/70 md:text-2xl">
                {getInitialLetter(user.name, user.email)}
              </span>
            )}
          </div>

          <Link
            href="/profile"
            className="mt-2 inline-flex rounded-lg border border-black/20 px-2.5 py-1 text-[11px] font-medium md:mt-3 md:px-3 md:py-1.5 md:text-xs"
          >
            Edit profile
          </Link>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm text-black/70">
            Hi, <strong>{user.name}</strong>
          </p>
          <p className="mt-1 text-sm text-black/70">
            Current points: <strong>{user.points}</strong>
          </p>
          <p className="mt-2 text-sm text-black/70">
            Level <strong>{user.level}</strong> ({levelProgress.percent}%)
          </p>
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, levelProgress.percent))}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      <div className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/60">
          Menu
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/play"
            className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg bg-blue-600 p-0 text-sm font-medium text-white"
          >
            {/* Use image as tile background and reserve bottom strip for label on all screen sizes. */}
            <Image
              src="/images/learning.png"
              alt="Learning"
              fill
              className="object-cover"
            />
            <span className="z-10 flex h-[10%] w-full items-center justify-center bg-black/50 text-xs sm:text-sm">
              Learning
            </span>
          </Link>
          <Link
            href="/forum"
            className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg bg-emerald-600 p-0 text-sm font-medium text-white"
          >
            <Image
              src="/images/forum.png"
              alt="Forum"
              fill
              className="object-cover"
            />
            <span className="z-10 flex h-[10%] w-full items-center justify-center bg-black/50 text-xs sm:text-sm">
              Forum
            </span>
          </Link>
          <Link
            href="/ai-chat"
            className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg bg-violet-600 p-0 text-sm font-medium text-white"
          >
            <Image
              src="/images/aichat.png"
              alt="AI Chat"
              fill
              className="object-cover"
            />
            <span className="z-10 flex h-[10%] w-full items-center justify-center bg-black/50 text-xs sm:text-sm">
              AI Chat
            </span>
          </Link>
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg bg-zinc-900 p-0 text-sm font-medium text-white"
            >
              <Image
                src="/images/admin.png"
                alt="Admin"
                fill
                className="object-cover"
              />
              <span className="z-10 flex h-[10%] w-full items-center justify-center bg-black/50 text-xs sm:text-sm">
                Admin
              </span>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <LogoutButton />
      </div>
    </div>
  );
}
