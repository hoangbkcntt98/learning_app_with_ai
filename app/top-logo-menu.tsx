"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type ThemeMode = "light" | "dark";
const storageKey = "theme_mode";

function applyTheme(mode: ThemeMode) {
  // Sync selected mode to <html> class and persist it.
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.themeMode = mode;
  window.localStorage.setItem(storageKey, mode);
}

export function TopLogoMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Resolve initial mode from storage once on client.
    if (typeof window === "undefined") {
      return "light";
    }
    return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
  });
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onWindowClick(event: MouseEvent) {
      // Close the dropdown when user clicks outside the logo menu area.
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      // Allow closing the menu with Escape.
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  function toggleThemeMode() {
    // Toggle between Light and Dark modes from the logo dropdown.
    const nextMode: ThemeMode = mode === "light" ? "dark" : "light";
    setMode(nextMode);
    applyTheme(nextMode);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open app menu"
      >
        <Image
          src="/images/logo.png"
          alt="BuBu Learning logo"
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg object-cover"
          priority
        />
        <span className="text-sm font-semibold">BuBu Learning</span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-12 z-50 min-w-40 rounded-lg border border-black/15 bg-white p-1 shadow-lg dark:bg-neutral-900"
        >
          <Link
            href="/"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
          >
            Hompage
          </Link>
          <Link
            href="/about"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
          >
            About
          </Link>
          <Link
            href="/contact"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
          >
            Contact
          </Link>
          <Link
            href="/donate"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="block rounded px-3 py-2 text-sm hover:bg-black/5"
          >
            Donate
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={toggleThemeMode}
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-black/5"
          >
            {/* Show Dark/Light icon action inside logo dropdown menu. */}
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M21.75 15.5A9.75 9.75 0 1 1 8.5 2.25a.75.75 0 0 1 .88.98 8.25 8.25 0 0 0 11.39 11.39.75.75 0 0 1 .98.88Z" />
            </svg>
            {mode === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
