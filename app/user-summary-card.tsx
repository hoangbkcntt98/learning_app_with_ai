"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ActionResultPopup } from "./action-result-popup";
import { LogoutButton } from "./logout-button";

export type UserSummary = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  avatarUrl: string | null;
  points: number;
  gold: number;
  level: number;
  aiQuotaRemaining?: number;
  aiQuotaLimit?: number;
};

const defaultAvatarUrl = "/images/logo.png";
const themeStorageKey = "theme_mode";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  // Sync selected mode to <html> class and persist it.
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.themeMode = mode;
  window.localStorage.setItem(themeStorageKey, mode);
}

type UserStoreItem = {
  id: string;
  isEquipped: boolean;
  expiresAt: string;
  product: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    priceGold: number;
    durationDays: number;
    productType: number;
    useType: 0 | 1;
  };
};

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

function getLevelProgressStats(points: number, level: number) {
  // Return earned points since current level and required points to next level.
  if (level <= 0) {
    const min = 0;
    const max = 10;
    const clampedPoints = Math.max(min, Math.min(points, max));
    return {
      earnedSinceLevelStart: clampedPoints - min,
      pointsNeededToNextLevel: max - min,
    };
  }

  const min = 10 ** level / 2;
  const max = 10 ** (level + 1) / 2;
  const clampedPoints = Math.max(min, Math.min(points, max));
  return {
    earnedSinceLevelStart: clampedPoints - min,
    pointsNeededToNextLevel: max - min,
  };
}

function getSegmentBadgeClass(segment: UserSummary["segment"]) {
  switch (segment) {
    case "Premium":
      return "border-amber-300 bg-amber-50 text-amber-800";
    case "Pro":
      return "border-indigo-300 bg-indigo-50 text-indigo-800";
    case "Plus":
      return "border-sky-300 bg-sky-50 text-sky-800";
    case "Free":
    default:
      return "border-zinc-300 bg-zinc-50 text-zinc-700";
  }
}

function AiQuotaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="7" width="16" height="10" rx="2" />
      <path d="M12 3v4M9 17v2M15 17v2M7 11h2M15 11h2" />
    </svg>
  );
}

export function UserTopRightStats({
  user,
  className,
}: {
  user: UserSummary;
  className?: string;
}) {
  const [displayedGold, setDisplayedGold] = useState(user.gold);
  const [aiQuotaRemaining, setAiQuotaRemaining] = useState<number | undefined>(user.aiQuotaRemaining);
  const [aiQuotaLimit, setAiQuotaLimit] = useState<number | undefined>(user.aiQuotaLimit);
  const displayedAiQuotaRemaining = aiQuotaRemaining ?? user.aiQuotaRemaining;
  const displayedAiQuotaLimit = aiQuotaLimit ?? user.aiQuotaLimit;

  useEffect(() => {
    let mounted = true;
    async function refreshAiQuota() {
      try {
        const response = await fetch("/api/ai/quota", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { remaining?: number; limit?: number };
        if (!mounted) {
          return;
        }
        setAiQuotaRemaining(
          typeof body.remaining === "number" ? body.remaining : undefined,
        );
        setAiQuotaLimit(typeof body.limit === "number" ? body.limit : undefined);
      } catch {
        // Keep existing UI values when quota endpoint is unavailable.
      }
    }

    refreshAiQuota();
    window.addEventListener("ai:usage-updated", refreshAiQuota);
    return () => {
      mounted = false;
      window.removeEventListener("ai:usage-updated", refreshAiQuota);
    };
  }, []);

  useEffect(() => {
    function onUserStatsUpdated(event: Event) {
      const nextGold = (event as CustomEvent<{ gold?: number }>).detail?.gold;
      if (typeof nextGold === "number") {
        setDisplayedGold(nextGold);
      }
    }

    window.addEventListener("user:stats-updated", onUserStatsUpdated);
    return () => {
      window.removeEventListener("user:stats-updated", onUserStatsUpdated);
    };
  }, []);

  return (
    <div
      className={className ?? "absolute right-8 top-6 z-10 flex items-center gap-3 text-sm text-black/80"}
    >
      <div className="inline-flex items-center gap-1.5" title="Gold">
        <Image
          src="/images/gold.jpg"
          alt="Gold"
          width={16}
          height={16}
          className="rounded-full object-cover"
        />
        <strong>{displayedGold}</strong>
      </div>
      {typeof displayedAiQuotaRemaining === "number" && typeof displayedAiQuotaLimit === "number" ? (
        <div className="inline-flex items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5" title="AI chat quota">
            <AiQuotaIcon />
            <strong>
              {displayedAiQuotaRemaining}/{displayedAiQuotaLimit}
            </strong>
          </div>
          <LogoutButton variant="icon" />
        </div>
      ) : null}
    </div>
  );
}

export function UserSummaryCard({
  user,
  showEditProfile = true,
}: {
  user: UserSummary;
  showEditProfile?: boolean;
}) {
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
  });
  const levelProgressPercent = computeLevelProgress(user.points, user.level);
  const levelProgressStats = getLevelProgressStats(user.points, user.level);
  const [hasPetItems, setHasPetItems] = useState(false);
  const [showPetPopup, setShowPetPopup] = useState(false);
  const [petItems, setPetItems] = useState<UserStoreItem[]>([]);
  const [openDescriptionIds, setOpenDescriptionIds] = useState<string[]>([]);
  const [isLoadingPetItems, setIsLoadingPetItems] = useState(false);
  const [savingEquipId, setSavingEquipId] = useState<string>("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);

  const loadPetItems = useCallback(async () => {
    // Load current active purchased items for Pet/Equip button and popup.
    try {
      const response = await fetch("/api/store/my-items", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as {
        items?: UserStoreItem[];
        hasItems?: boolean;
      };
      setPetItems(body.items ?? []);
      setHasPetItems(Boolean(body.hasItems));
    } catch {
      // Keep summary card resilient if store API is unavailable.
    }
  }, []);

  useEffect(() => {
    loadPetItems();
  }, [loadPetItems]);

  useEffect(() => {
    // Refresh summary-card pet inventory after successful store purchases.
    function onStoreUpdated() {
      loadPetItems();
    }
    window.addEventListener("store:updated", onStoreUpdated);
    return () => {
      window.removeEventListener("store:updated", onStoreUpdated);
    };
  }, [loadPetItems]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (!avatarMenuRef.current) {
        return;
      }
      if (event.target instanceof Node && !avatarMenuRef.current.contains(event.target)) {
        setShowAvatarMenu(false);
      }
    }
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  async function openPetPopup() {
    // Open popup and refresh owned items from latest server state.
    setShowPetPopup(true);
    setIsLoadingPetItems(true);
    setError("");
    setStatus("");
    setOpenDescriptionIds([]);
    await loadPetItems();
    setIsLoadingPetItems(false);
  }

  function toggleThemeMode() {
    const nextMode: ThemeMode = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextMode);
    applyTheme(nextMode);
  }

  function toggleDescription(itemId: string) {
    // Toggle description visibility for one purchased item card.
    setOpenDescriptionIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  }

  async function handleUseItem(item: UserStoreItem) {
    // Use selected item via API and refresh popup state.
    if (item.product.useType === 1) {
      const confirmed = window.confirm(
        "This is a one-time-use product. Do you want to use it?",
      );
      if (!confirmed) {
        return;
      }
    }
    setError("");
    setStatus("");
    setSavingEquipId(item.id);
    try {
      const response = await fetch("/api/store/equip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to equip item.");
        return;
      }
      const body = (await response.json()) as { items?: UserStoreItem[]; consumedOneTime?: boolean };
      setPetItems(body.items ?? []);
      setStatus(
        body.consumedOneTime ? "One-time item used successfully." : "Item is now in use.",
      );
      window.dispatchEvent(new Event("store:updated"));
    } catch {
      setError("Failed to equip item.");
    } finally {
      setSavingEquipId("");
    }
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 p-8 shadow-sm">
      <ActionResultPopup
        isOpen={Boolean(error || status)}
        message={error || status}
        tone={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setStatus("");
        }}
      />
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex flex-col items-center">
          <div ref={avatarMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowAvatarMenu((prev) => !prev)}
              className="relative flex h-16 w-16 items-center justify-center overflow-visible md:h-24 md:w-24"
              aria-label="Open user menu"
              aria-expanded={showAvatarMenu}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-black/25 bg-black/5">
                {/* Use app default avatar when user has not uploaded one. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatarUrl || defaultAvatarUrl}
                  alt={`${user.name} avatar`}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute -bottom-2 inline-flex rounded-full border border-black/20 bg-white px-2 py-0.5 text-[10px] font-semibold text-black/80 md:text-xs">
                Lv {user.level}
              </span>
            </button>

            {showAvatarMenu ? (
              <div className="absolute left-1/2 top-full z-20 mt-3 flex w-40 -translate-x-1/2 flex-col gap-2 rounded-lg border border-black/15 bg-white p-2 shadow-lg">
                {showEditProfile ? (
                  <Link
                    href="/profile"
                    onClick={() => setShowAvatarMenu(false)}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-center text-xs font-medium text-black/80"
                  >
                    Edit profile
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={toggleThemeMode}
                  className="flex w-full items-center gap-2 rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium text-black/80"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M21.75 15.5A9.75 9.75 0 1 1 8.5 2.25a.75.75 0 0 1 .88.98 8.25 8.25 0 0 0 11.39 11.39.75.75 0 0 1 .98.88Z" />
                  </svg>
                  {themeMode === "light" ? "Dark Mode" : "Light Mode"}
                </button>
                <LogoutButton variant="menu" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm text-black/70">
            Hi, <strong>{user.name}</strong>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-5 w-full overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, levelProgressPercent))}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">
                {levelProgressPercent}%
              </span>
            </div>
            <span className="text-xs text-black/60">
              ({levelProgressStats.earnedSinceLevelStart}/{levelProgressStats.pointsNeededToNextLevel})
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSegmentBadgeClass(user.segment)}`}
            >
              {user.segment}
            </span>
            {hasPetItems ? (
              <button
                type="button"
                onClick={() => void openPetPopup()}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="6.5" cy="8.5" r="1.5" />
                  <circle cx="11.5" cy="6.5" r="1.5" />
                  <circle cx="16.5" cy="8.5" r="1.5" />
                  <path d="M12 18c-3 0-5-1.8-5-4 0-1.7 1.3-3 3-3 .9 0 1.8.4 2.3 1 .5-.6 1.4-1 2.3-1 1.7 0 3 1.3 3 3 0 2.2-2 4-5 4Z" />
                </svg>
                Pet / Equip
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {showPetPopup ? (
        <div className="loading-popup-overlay" role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-[min(920px,92vw)] overflow-y-auto rounded-xl border border-black/10 bg-white p-4 shadow-xl">
            {/* Popup listing purchased items with per-item Use button. */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-base font-semibold">Pet / Equip</p>
              <button
                type="button"
                onClick={() => setShowPetPopup(false)}
                className="rounded-lg border border-black/20 px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            {isLoadingPetItems ? (
              <p className="text-sm text-black/70">Loading pets...</p>
            ) : petItems.length === 0 ? (
              <p className="text-sm text-black/70">No active purchased pet items.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {petItems.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-lg border border-black/10">
                    <div className="relative aspect-square w-full">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm font-semibold text-white">
                        {item.product.name}
                      </div>
                    </div>
                    <div className="space-y-2 p-3">
                      <p className="text-xs text-black/60">
                        Expires:{" "}
                        {item.product.useType === 1
                          ? "1 time"
                          : new Date(item.expiresAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-black/60">
                        Status:{" "}
                        {item.product.useType === 1
                          ? "Ready to use"
                          : item.isEquipped
                            ? "In use"
                            : "Not in use"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDescription(item.id)}
                          className="rounded-lg border border-black/20 px-3 py-1.5 text-sm font-medium"
                        >
                          {openDescriptionIds.includes(item.id) ? "Hide description" : "Description"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseItem(item)}
                          disabled={savingEquipId === item.id || (item.product.useType === 0 && item.isEquipped)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 disabled:opacity-50"
                        >
                          {savingEquipId === item.id
                            ? "Using..."
                            : item.product.useType === 1
                              ? "Use"
                              : item.isEquipped
                                ? "In use"
                                : "Use"}
                        </button>
                      </div>
                      {openDescriptionIds.includes(item.id) ? (
                        <p className="rounded-md bg-black/[0.03] px-2 py-1 text-xs text-black/75">
                          {item.product.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
