"use client";

import { FormEvent, useRef, useState } from "react";

type ProfileUser = {
  email: string;
  name: string;
  avatarUrl: string | null;
};

const defaultAvatarUrl = "/images/logo.png";

export function ProfileClient({ initialUser }: { initialUser: ProfileUser }) {
  const [user, setUser] = useState(initialUser);
  const [nameInput, setNameInput] = useState(initialUser.name);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nameInput.trim() || isSavingName) {
      return;
    }

    setError("");
    setStatus("");
    setIsSavingName(true);
    try {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to update name.");
        return;
      }
      const body = (await response.json()) as { user?: { name?: string } };
      const nextName = body.user?.name?.trim() || nameInput.trim();
      setUser((prev) => ({ ...prev, name: nextName }));
      setNameInput(nextName);
      setStatus("Name updated.");
    } catch {
      setError("Failed to update name.");
    } finally {
      setIsSavingName(false);
    }
  }

  async function uploadAvatar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file || isUploadingAvatar) {
      return;
    }

    setError("");
    setStatus("");
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to upload avatar.");
        return;
      }

      const body = (await response.json()) as { user?: { avatarUrl?: string | null } };
      setUser((prev) => ({
        ...prev,
        avatarUrl:
          typeof body.user?.avatarUrl === "string" ? body.user.avatarUrl : body.user?.avatarUrl ?? null,
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus("Avatar updated.");
    } catch {
      setError("Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-black/10 p-4">
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex flex-col items-center">
          {/* Keep avatar in a circular frame for profile screen consistency. */}
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-black/25 bg-black/5">
            {/* Use app default avatar when user has not uploaded one. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatarUrl || defaultAvatarUrl}
              alt={`${user.name} avatar`}
              className="h-full w-full object-cover"
            />
          </div>

          <form onSubmit={uploadAvatar} className="mt-3 w-full space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              disabled={isUploadingAvatar}
              className="w-full text-xs"
            />
            <button
              type="submit"
              disabled={isUploadingAvatar}
              className="w-full rounded-lg border border-black/20 px-3 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {isUploadingAvatar ? "Uploading..." : "Upload avatar"}
            </button>
          </form>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm text-black/70">
            Email: <strong>{user.email}</strong>
          </p>

          <form onSubmit={saveName} className="mt-4 space-y-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/70">Display name</span>
              <input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                disabled={isSavingName}
              />
            </label>
            <button
              type="submit"
              disabled={isSavingName || !nameInput.trim()}
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSavingName ? "Saving..." : "Save name"}
            </button>
          </form>

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {status ? <p className="mt-3 text-sm text-green-700">{status}</p> : null}
        </div>
      </div>
    </section>
  );
}
