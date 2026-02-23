"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ActionResultPopup } from "./action-result-popup";

export type UserSummary = {
  email: string;
  name: string;
  segment: "Free" | "Plus" | "Pro" | "Premium";
  avatarUrl: string | null;
  points: number;
  gold: number;
  level: number;
};

const defaultAvatarUrl = "/images/logo.png";

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

export function UserSummaryCard({
  user,
  showEditProfile = true,
}: {
  user: UserSummary;
  showEditProfile?: boolean;
}) {
  const levelProgressPercent = computeLevelProgress(user.points, user.level);
  const pointsToNextLevel = getPointsToNextLevel(user.points, user.level);
  const [hasPetItems, setHasPetItems] = useState(false);
  const [showPetPopup, setShowPetPopup] = useState(false);
  const [petItems, setPetItems] = useState<UserStoreItem[]>([]);
  const [openDescriptionIds, setOpenDescriptionIds] = useState<string[]>([]);
  const [isLoadingPetItems, setIsLoadingPetItems] = useState(false);
  const [savingEquipId, setSavingEquipId] = useState<string>("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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
          <div className="relative flex h-16 w-16 items-center justify-center overflow-visible md:h-24 md:w-24">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-black/25 bg-black/5">
              {/* Use app default avatar when user has not uploaded one. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl || defaultAvatarUrl}
                alt={`${user.name} avatar`}
                className="h-full w-full object-cover"
              />
            </div>

            <span
              className={`absolute -bottom-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold md:text-xs ${getSegmentBadgeClass(user.segment)}`}
            >
              {user.segment}
            </span>
          </div>

          {showEditProfile ? (
            <div className="mt-4 flex flex-col gap-2 md:mt-5">
              <Link
                href="/profile"
                className="inline-flex rounded-lg border border-black/20 px-2.5 py-1 text-[11px] font-medium md:px-3 md:py-1.5 md:text-xs"
              >
                Edit profile
              </Link>
              {hasPetItems ? (
                <button
                  type="button"
                  onClick={openPetPopup}
                  className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 md:px-3 md:py-1.5 md:text-xs"
                >
                  Pet / Equip
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm text-black/70">
            Hi, <strong>{user.name}</strong>
          </p>
          <p className="mt-1 text-sm text-black/70">
            Current points: <strong>{user.points}</strong>
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-black/70">
            Gold: <strong>{user.gold}</strong>
            <Image
              src="/images/gold.jpg"
              alt="Gold"
              width={16}
              height={16}
              className="rounded-full object-cover"
            />
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
