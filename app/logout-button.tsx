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
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isLoading ? "Logging out..." : "Logout"}
      </button>
    </>
  );
}
