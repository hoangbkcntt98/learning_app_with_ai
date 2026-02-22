"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadingPopup } from "./loading-popup";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {isLoading ? <LoadingPopup message="Logging out..." /> : null}
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {/* Show a logout icon for the sign-out action button. */}
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
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        {isLoading ? "Logging out..." : "Logout"}
      </button>
    </>
  );
}
