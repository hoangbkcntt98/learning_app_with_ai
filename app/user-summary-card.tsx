"use client";

import Link from "next/link";

export type UserSummary = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  avatarUrl: string | null;
  points: number;
  level: number;
};

function getSegmentBadgeClass(segment: UserSummary["segment"]) {
  // Apply a distinct badge style for each segment tier.
  switch (segment) {
    case "Premium":
      return "border-yellow-400/80 bg-yellow-200 text-yellow-900";
    case "Pro":
      return "border-violet-400/80 bg-violet-200 text-violet-900";
    case "Plus":
      return "border-sky-400/80 bg-sky-200 text-sky-900";
    case "Free":
    default:
      return "border-zinc-300 bg-zinc-200 text-zinc-800";
  }
}

function computeLevelProgress(points: number, level: number) {
  // Compute progress to next level using powers-of-10 thresholds.
  if (level <= 0) {
    const min = 0;
    const max = 10;
    const clampedPoints = Math.max(min, Math.min(points, max));
    const ratio = (clampedPoints - min) / (max - min);
    return Math.round(ratio * 100);
  }

  const min = 10 ** level / 2;
  const max = 10 ** (level + 1) / 2;
  const clampedPoints = Math.max(min, Math.min(points, max));
  const ratio = (clampedPoints - min) / (max - min);
  return Math.round(ratio * 100);
}

function getPointsToNextLevel(points: number, level: number) {
  // Match level thresholds so UI shows accurate remaining points.
  const nextLevelPoints = level <= 0 ? 10 : 10 ** (level + 1) / 2;
  return Math.max(0, Math.ceil(nextLevelPoints - points));
}

function getInitialLetter(name: string, email: string) {
  // Build a simple fallback avatar label when no image is available.
  const source = name.trim() || email.trim();
  return source ? source[0].toUpperCase() : "U";
}

export function UserSummaryCard({
  user,
  showEditProfile = true,
}: {
  user: UserSummary;
  showEditProfile?: boolean;
}) {
  const levelProgressPercent = computeLevelProgress(user.points, user.level);
  const pointsToNextLevel = getPointsToNextLevel(user.points, user.level);

  return (
    <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex flex-col items-center">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-visible md:h-24 md:w-24">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-black/25 bg-black/5">
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

            <span
              className={`absolute -bottom-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold md:text-xs ${getSegmentBadgeClass(user.segment)}`}
            >
              {user.segment}
            </span>
          </div>

          {showEditProfile ? (
            <Link
              href="/profile"
              className="mt-4 inline-flex rounded-lg border border-black/20 px-2.5 py-1 text-[11px] font-medium md:mt-5 md:px-3 md:py-1.5 md:text-xs"
            >
              Edit profile
            </Link>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm text-black/70">
            Hi, <strong>{user.name}</strong>
          </p>
          <p className="mt-1 text-sm text-black/70">
            Current points: <strong>{user.points}</strong>
          </p>
          <p className="mt-2 text-sm text-black/70">
            Level <strong>{user.level}</strong> ({levelProgressPercent}%)
          </p>
          <div className="mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, levelProgressPercent))}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-black/60">
            Need <strong>{pointsToNextLevel}</strong> more points to reach next level
          </p>
        </div>
      </div>
    </div>
  );
}
