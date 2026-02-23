"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type HomeUser = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  avatarUrl: string | null;
  points: number;
  level: number;
  role: "admin" | "user";
};

function getSegmentBadgeClass(segment: HomeUser["segment"]) {
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

export function HomeDashboard({
  initialUser,
  featureAccess,
}: {
  initialUser: HomeUser;
  featureAccess: {
    learning: { allowed: boolean; message: string; howTo: string };
    forum: { allowed: boolean; message: string; howTo: string };
    aiChat: { allowed: boolean; message: string; howTo: string };
    review: { allowed: boolean; message: string; howTo: string };
    admin: { allowed: boolean; message: string; howTo: string };
  };
}) {
  const user = initialUser;
  const [lockedFeaturePopup, setLockedFeaturePopup] = useState<{
    label: string;
    message: string;
    howTo: string;
  } | null>(null);
  const levelProgress = useMemo(
    () => computeLevelProgress(user.points, user.level),
    [user.points, user.level],
  );

  return (
    <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex flex-col items-center">
          {/* Show user avatar with circular border as requested. */}
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

            {/* Overlay membership segment badge at the lower front of avatar. */}
            <span
              className={`absolute -bottom-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold md:text-xs ${getSegmentBadgeClass(user.segment)}`}
            >
              {user.segment}
            </span>
          </div>

          <Link
            href="/profile"
            className="mt-4 inline-flex rounded-lg border border-black/20 px-2.5 py-1 text-[11px] font-medium md:mt-5 md:px-3 md:py-1.5 md:text-xs"
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
          <FeatureTile
            href="/play"
            label="Learning"
            imageSrc="/images/learning.png"
            imageAlt="Learning"
            isLocked={!featureAccess.learning.allowed}
            onLockedClick={() =>
              setLockedFeaturePopup({
                label: "Learning",
                message: featureAccess.learning.message,
                howTo: featureAccess.learning.howTo,
              })
            }
          />
          <FeatureTile
            href="/forum"
            label="Forum"
            imageSrc="/images/forum.png"
            imageAlt="Forum"
            isLocked={!featureAccess.forum.allowed}
            onLockedClick={() =>
              setLockedFeaturePopup({
                label: "Forum",
                message: featureAccess.forum.message,
                howTo: featureAccess.forum.howTo,
              })
            }
          />
          <FeatureTile
            href="/ai-chat"
            label="AI Chat"
            imageSrc="/images/aichat.png"
            imageAlt="AI Chat"
            isLocked={!featureAccess.aiChat.allowed}
            onLockedClick={() =>
              setLockedFeaturePopup({
                label: "AI Chat",
                message: featureAccess.aiChat.message,
                howTo: featureAccess.aiChat.howTo,
              })
            }
          />
          <FeatureTile
            href="/review"
            label="Review"
            imageSrc="/images/review.png"
            imageAlt="Review"
            isLocked={!featureAccess.review.allowed}
            onLockedClick={() =>
              setLockedFeaturePopup({
                label: "Review",
                message: featureAccess.review.message,
                howTo: featureAccess.review.howTo,
              })
            }
          />
          {user.role === "admin" ? (
            <FeatureTile
              href="/admin"
              label="Admin"
              imageSrc="/images/admin.png"
              imageAlt="Admin"
              isLocked={!featureAccess.admin.allowed}
              onLockedClick={() =>
                setLockedFeaturePopup({
                  label: "Admin",
                  message: featureAccess.admin.message,
                  howTo: featureAccess.admin.howTo,
                })
              }
            />
          ) : null}
        </div>
      </div>

      {lockedFeaturePopup ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="loading-popup-card min-w-[300px]">
            {/* Explain restricted feature conditions and how user can unlock access. */}
            <p className="text-base font-semibold text-amber-700">
              {lockedFeaturePopup.label} is locked
            </p>
            <p className="text-sm text-black/70">
              {lockedFeaturePopup.message || "You do not meet the access conditions yet."}
            </p>
            <p className="text-sm text-black/70">
              {lockedFeaturePopup.howTo || "Check your segment and level requirements."}
            </p>
            <button
              type="button"
              onClick={() => setLockedFeaturePopup(null)}
              className="mt-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeatureTile({
  href,
  label,
  imageSrc,
  imageAlt,
  isLocked,
  onLockedClick,
}: {
  href: string;
  label: string;
  imageSrc: string;
  imageAlt: string;
  isLocked: boolean;
  onLockedClick: () => void;
}) {
  // Show lock + blurred background when feature is restricted for current user.
  const content = (
    <>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        className={isLocked ? "object-cover blur-[2px] scale-[1.03]" : "object-cover"}
      />
      {isLocked ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/35">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 1 1 8 0v3" />
            </svg>
          </div>
        </div>
      ) : null}
      <span className="z-20 flex h-[10%] w-full items-center justify-center bg-black/50 text-xs sm:text-sm">
        {label}
      </span>
    </>
  );

  if (isLocked) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg bg-black/20 p-0 text-sm font-medium text-white"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="relative inline-flex aspect-square w-full flex-col items-center justify-end gap-0 overflow-hidden rounded-lg p-0 text-sm font-medium text-white"
    >
      {content}
    </Link>
  );
}
