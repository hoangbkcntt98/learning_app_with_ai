"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LoadingPopup } from "../loading-popup";
import { ActionResultPopup } from "../action-result-popup";

type AppSettings = {
  maxRegisteredUsers: number;
  aiDailyQuotaPerUser?: number;
};

type FeatureAccessRule = {
  featureId: number;
  featureKey: string;
  featureName: string;
  routePath: string;
  minLevel: number;
  allowUser: boolean;
  allowAdmin: boolean;
  allowFree: boolean;
  allowPlus: boolean;
  allowPro: boolean;
  allowPremium: boolean;
};

type FeatureFormDraft = {
  featureName: string;
  featureKey: string;
  routePath: string;
  minLevel: string;
  allowUser: boolean;
  allowAdmin: boolean;
  allowFree: boolean;
  allowPlus: boolean;
  allowPro: boolean;
  allowPremium: boolean;
};

export function AdminClient() {
  const [settings, setSettings] = useState<AppSettings>({
    maxRegisteredUsers: 1000,
  });
  const [featureRules, setFeatureRules] = useState<FeatureAccessRule[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<number>(1);
  const [selectedFeatureRule, setSelectedFeatureRule] = useState<FeatureAccessRule | null>(null);
  const [newFeatureDraft, setNewFeatureDraft] = useState<FeatureFormDraft>({
    featureName: "",
    featureKey: "",
    routePath: "",
    minLevel: "0",
    allowUser: true,
    allowAdmin: false,
    allowFree: true,
    allowPlus: true,
    allowPro: true,
    allowPremium: true,
  });
  const [allUsersAiDailyQuotaInput, setAllUsersAiDailyQuotaInput] = useState("20");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  function syncFeatureSelection(nextRules: FeatureAccessRule[]) {
    // Keep selected feature stable after create/delete/update operations.
    if (nextRules.length === 0) {
      setSelectedFeatureId(0);
      setSelectedFeatureRule(null);
      return;
    }

    const matched = nextRules.find((item) => item.featureId === selectedFeatureId);
    const nextSelected = matched ?? nextRules[0];
    setSelectedFeatureId(nextSelected.featureId);
    setSelectedFeatureRule(nextSelected);
  }

  useEffect(() => {
    async function loadSettings() {
      setError("");
      setLoadingMessage("Loading settings...");
      try {
        // Load base settings and feature access rules in one batch.
        const [settingsResponse, featuresResponse] = await Promise.all([
          fetch("/api/admin/settings"),
          fetch("/api/admin/features"),
        ]);
        if (!settingsResponse.ok || !featuresResponse.ok) {
          setError("Failed to load settings.");
          return;
        }
        const settingsBody = (await settingsResponse.json()) as { settings: AppSettings };
        const featuresBody = (await featuresResponse.json()) as { features: FeatureAccessRule[] };
        setSettings(settingsBody.settings);
        setAllUsersAiDailyQuotaInput(String(settingsBody.settings.aiDailyQuotaPerUser ?? 20));
        const rules = featuresBody.features ?? [];
        setFeatureRules(rules);
        if (rules.length === 0) {
          setSelectedFeatureId(0);
          setSelectedFeatureRule(null);
        } else {
          setSelectedFeatureId(rules[0].featureId);
          setSelectedFeatureRule(rules[0]);
        }
      } catch {
        setError("Failed to load settings.");
      } finally {
        setLoadingMessage("");
      }
    }

    loadSettings();
  }, []);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setLoadingMessage("Saving settings...");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxRegisteredUsers: settings.maxRegisteredUsers,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to save settings.");
        return;
      }
      const body = (await response.json()) as { settings: AppSettings };
      setSettings(body.settings);
      setStatus("Settings updated.");
    } catch {
      setError("Failed to save settings.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function updateAiDailyQuotaForAllUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const parsedQuota = Number.parseInt(allUsersAiDailyQuotaInput, 10);
    if (!Number.isFinite(parsedQuota) || parsedQuota <= 0) {
      setError("AI daily quota must be a positive number.");
      return;
    }

    setLoadingMessage("Updating AI quota for all users...");
    try {
      const response = await fetch("/api/admin/users/quota", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiDailyQuota: parsedQuota }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update AI quota for all users.");
        return;
      }
      setStatus("AI daily quota updated for all users.");
    } catch {
      setError("Failed to update AI quota for all users.");
    } finally {
      setLoadingMessage("");
    }
  }

  function handleFeatureSelectionChange(value: number) {
    setSelectedFeatureId(value);
    const matched = featureRules.find((item) => item.featureId === value) ?? null;
    setSelectedFeatureRule(matched);
  }

  async function saveFeatureRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFeatureRule) {
      return;
    }
    setError("");
    setStatus("");
    setLoadingMessage(`Saving ${selectedFeatureRule.featureName} rule...`);
    try {
      const response = await fetch("/api/admin/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId: selectedFeatureRule.featureId,
          featureKey: selectedFeatureRule.featureKey,
          featureName: selectedFeatureRule.featureName,
          routePath: selectedFeatureRule.routePath,
          minLevel: selectedFeatureRule.minLevel,
          allowUser: selectedFeatureRule.allowUser,
          allowAdmin: selectedFeatureRule.allowAdmin,
          allowFree: selectedFeatureRule.allowFree,
          allowPlus: selectedFeatureRule.allowPlus,
          allowPro: selectedFeatureRule.allowPro,
          allowPremium: selectedFeatureRule.allowPremium,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to save feature rule.");
        return;
      }
      const body = (await response.json()) as { feature: FeatureAccessRule };
      setFeatureRules((prev) => {
        const next = prev.map((item) => (item.featureId === body.feature.featureId ? body.feature : item));
        syncFeatureSelection(next);
        return next;
      });
      setStatus(`${body.feature.featureName} restriction updated.`);
    } catch {
      setError("Failed to save feature rule.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function createFeatureRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    const minLevel = Number.parseInt(newFeatureDraft.minLevel || "0", 10);
    if (!newFeatureDraft.featureName.trim() || !newFeatureDraft.featureKey.trim() || !newFeatureDraft.routePath.trim()) {
      setError("Feature name, key, and route are required.");
      return;
    }
    if (!newFeatureDraft.routePath.trim().startsWith("/")) {
      setError("Route must start with '/'.");
      return;
    }
    if (!Number.isFinite(minLevel) || minLevel < 0) {
      setError("Minimum level must be 0 or above.");
      return;
    }

    setLoadingMessage("Creating feature...");
    try {
      const response = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureName: newFeatureDraft.featureName.trim(),
          featureKey: newFeatureDraft.featureKey.trim(),
          routePath: newFeatureDraft.routePath.trim(),
          minLevel,
          allowUser: newFeatureDraft.allowUser,
          allowAdmin: newFeatureDraft.allowAdmin,
          allowFree: newFeatureDraft.allowFree,
          allowPlus: newFeatureDraft.allowPlus,
          allowPro: newFeatureDraft.allowPro,
          allowPremium: newFeatureDraft.allowPremium,
        }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create feature.");
        return;
      }
      const body = (await response.json()) as { feature: FeatureAccessRule };
      setFeatureRules((prev) => {
        const next = [...prev, body.feature].sort((a, b) => a.featureId - b.featureId);
        setSelectedFeatureId(body.feature.featureId);
        setSelectedFeatureRule(body.feature);
        return next;
      });
      setNewFeatureDraft({
        featureName: "",
        featureKey: "",
        routePath: "",
        minLevel: "0",
        allowUser: true,
        allowAdmin: false,
        allowFree: true,
        allowPlus: true,
        allowPro: true,
        allowPremium: true,
      });
      setStatus(`${body.feature.featureName} created.`);
    } catch {
      setError("Failed to create feature.");
    } finally {
      setLoadingMessage("");
    }
  }

  async function removeSelectedFeatureRule() {
    if (!selectedFeatureRule) {
      return;
    }
    const confirmed = window.confirm(`Delete feature "${selectedFeatureRule.featureName}"?`);
    if (!confirmed) {
      return;
    }

    setError("");
    setStatus("");
    setLoadingMessage(`Deleting ${selectedFeatureRule.featureName}...`);
    try {
      const response = await fetch("/api/admin/features", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureId: selectedFeatureRule.featureId }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to delete feature.");
        return;
      }
      setFeatureRules((prev) => {
        const next = prev.filter((item) => item.featureId !== selectedFeatureRule.featureId);
        syncFeatureSelection(next);
        return next;
      });
      setStatus("Feature deleted.");
    } catch {
      setError("Failed to delete feature.");
    } finally {
      setLoadingMessage("");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      {loadingMessage ? <LoadingPopup message={loadingMessage} /> : null}
      <ActionResultPopup
        isOpen={Boolean(error || status)}
        message={error || status}
        tone={error ? "error" : "success"}
        onClose={() => {
          setError("");
          setStatus("");
        }}
      />

      {/* Show feature-specific top image for admin screen. */}
      <div className="mb-5 flex justify-center">
        <Image
          src="/images/admin.png"
          alt="Admin feature"
          width={112}
          height={112}
          className="h-28 w-28 rounded-xl object-cover"
          priority
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <Link href="/" className="text-sm text-blue-700 underline">
          Back to menu
        </Link>
      </div>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <form onSubmit={saveSettings} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">
              Maximum registered users
            </span>
            <input
              type="number"
              min={1}
              value={settings.maxRegisteredUsers}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  maxRegisteredUsers: Number.parseInt(event.target.value || "1", 10),
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Save settings
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Feature access restriction</h2>
        <form onSubmit={saveFeatureRule} className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Feature</span>
            <select
              value={selectedFeatureId}
              onChange={(event) => handleFeatureSelectionChange(Number.parseInt(event.target.value, 10))}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            >
              {featureRules.map((feature) => (
                <option key={feature.featureId} value={feature.featureId}>
                  {`${feature.featureId} - ${feature.featureName}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Feature name</span>
            <input
              value={selectedFeatureRule?.featureName ?? ""}
              onChange={(event) =>
                setSelectedFeatureRule((prev) =>
                  prev
                    ? {
                        ...prev,
                        featureName: event.target.value,
                      }
                    : prev,
                )
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>

          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Feature key</span>
            <input
              value={selectedFeatureRule?.featureKey ?? ""}
              onChange={(event) =>
                setSelectedFeatureRule((prev) =>
                  prev
                    ? {
                        ...prev,
                        featureKey: event.target.value,
                      }
                    : prev,
                )
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>

          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Route path</span>
            <input
              value={selectedFeatureRule?.routePath ?? ""}
              onChange={(event) =>
                setSelectedFeatureRule((prev) =>
                  prev
                    ? {
                        ...prev,
                        routePath: event.target.value,
                      }
                    : prev,
                )
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>

          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Minimum level</span>
            <input
              type="number"
              min={0}
              value={selectedFeatureRule?.minLevel ?? 0}
              onChange={(event) =>
                setSelectedFeatureRule((prev) =>
                  prev
                    ? {
                        ...prev,
                        minLevel: Number.parseInt(event.target.value || "0", 10),
                      }
                    : prev,
                )
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-medium text-black/70">Allowed roles</p>
            <div className="grid grid-cols-2 gap-2 md:max-w-md">
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowUser ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowUser: event.target.checked } : prev,
                    )
                  }
                />
                User
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowAdmin ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowAdmin: event.target.checked } : prev,
                    )
                  }
                />
                Admin
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-medium text-black/70">Allowed segments</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowFree ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowFree: event.target.checked } : prev,
                    )
                  }
                />
                Free
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowPlus ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowPlus: event.target.checked } : prev,
                    )
                  }
                />
                Plus
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowPro ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowPro: event.target.checked } : prev,
                    )
                  }
                />
                Pro
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={selectedFeatureRule?.allowPremium ?? false}
                  onChange={(event) =>
                    setSelectedFeatureRule((prev) =>
                      prev ? { ...prev, allowPremium: event.target.checked } : prev,
                    )
                  }
                />
                Premium
              </label>
            </div>
          </div>

          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Save feature rule
          </button>
          <button
            type="button"
            onClick={removeSelectedFeatureRule}
            disabled={!selectedFeatureRule}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-red-300"
          >
            Delete feature
          </button>
        </form>

        <form onSubmit={createFeatureRule} className="mt-6 grid gap-3 border-t border-black/10 pt-4 md:grid-cols-2">
          <p className="md:col-span-2 text-sm font-semibold">Create new feature</p>
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Feature name</span>
            <input
              value={newFeatureDraft.featureName}
              onChange={(event) =>
                setNewFeatureDraft((prev) => ({
                  ...prev,
                  featureName: event.target.value,
                }))
              }
              placeholder="Learning"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Feature key</span>
            <input
              value={newFeatureDraft.featureKey}
              onChange={(event) =>
                setNewFeatureDraft((prev) => ({
                  ...prev,
                  featureKey: event.target.value,
                }))
              }
              placeholder="learning"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Route path</span>
            <input
              value={newFeatureDraft.routePath}
              onChange={(event) =>
                setNewFeatureDraft((prev) => ({
                  ...prev,
                  routePath: event.target.value,
                }))
              }
              placeholder="/play"
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">Minimum level</span>
            <input
              type="number"
              min={0}
              value={newFeatureDraft.minLevel}
              onChange={(event) =>
                setNewFeatureDraft((prev) => ({
                  ...prev,
                  minLevel: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-medium text-black/70">Allowed roles</p>
            <div className="grid grid-cols-2 gap-2 md:max-w-md">
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowUser}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowUser: event.target.checked,
                    }))
                  }
                />
                User
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowAdmin}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowAdmin: event.target.checked,
                    }))
                  }
                />
                Admin
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <p className="mb-2 text-xs font-medium text-black/70">Allowed segments</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowFree}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowFree: event.target.checked,
                    }))
                  }
                />
                Free
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowPlus}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowPlus: event.target.checked,
                    }))
                  }
                />
                Plus
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowPro}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowPro: event.target.checked,
                    }))
                  }
                />
                Pro
              </label>
              <label className="inline-flex items-center gap-2 rounded border border-black/15 px-2 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={newFeatureDraft.allowPremium}
                  onChange={(event) =>
                    setNewFeatureDraft((prev) => ({
                      ...prev,
                      allowPremium: event.target.checked,
                    }))
                  }
                />
                Premium
              </label>
            </div>
          </div>

          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Create feature
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Setting for all user</h2>
        <form onSubmit={updateAiDailyQuotaForAllUsers} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="block md:max-w-xs">
            <span className="mb-1 block text-xs font-medium text-black/70">
              AI_DAILY_QUOTA_PER_USER
            </span>
            <input
              type="number"
              min={1}
              value={allUsersAiDailyQuotaInput}
              onChange={(event) => setAllUsersAiDailyQuotaInput(event.target.value)}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white">
            Apply to all users
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 p-4">
        {/* Navigate to dedicated management routes as requested. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            User management
          </Link>
          <Link
            href="/admin/questions"
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Question management
          </Link>
          <Link
            href="/admin/question-fields"
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white sm:col-span-2"
          >
            Question Field Management
          </Link>
          <Link
            href="/admin/question-levels"
            className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white sm:col-span-2"
          >
            Question Level Management
          </Link>
        </div>
      </section>
    </main>
  );
}
