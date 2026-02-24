"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserSummaryCard } from "./user-summary-card";

type HomeUser = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  avatarUrl: string | null;
  points: number;
  gold: number;
  level: number;
  aiQuotaRemaining: number;
  aiQuotaLimit: number;
  role: "admin" | "user";
};

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

  return (
    <div className="w-full space-y-6">
      <UserSummaryCard user={user} />

      <div className="w-full rounded-2xl border border-black/10 p-4 shadow-sm">
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
          <FeatureTile
            href="/store"
            label="Store"
            imageSrc="/images/store.png"
            imageAlt="Store"
            isLocked={false}
            onLockedClick={() => {}}
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
