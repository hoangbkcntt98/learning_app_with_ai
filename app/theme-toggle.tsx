"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const storageKey = "theme_mode";

function applyTheme(mode: ThemeMode) {
  // Apply theme class to <html> and persist user preference.
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.themeMode = mode;
  window.localStorage.setItem(storageKey, mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    // Initialize theme from local storage with Light as the default mode.
    const stored = window.localStorage.getItem(storageKey);
    const initialMode: ThemeMode =
      stored === "light" || stored === "dark" ? stored : "light";
    setMode(initialMode);
    applyTheme(initialMode);
  }, []);

  function handleModeChange(nextMode: ThemeMode) {
    setMode(nextMode);
    applyTheme(nextMode);
  }

  function handleToggle() {
    // Toggle between only Light and Dark modes.
    handleModeChange(mode === "light" ? "dark" : "light");
  }

  return (
    <div className="fixed right-4 top-4 z-50">
      {/* Single icon button toggles Light <-> Dark mode. */}
      <button
        type="button"
        aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
        onClick={handleToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,0,0,0.2)] bg-[rgba(255,255,255,0.9)] text-[#111827] shadow-sm backdrop-blur"
      >
        {/* Keep one fixed icon regardless of the active theme mode. */}
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d="M21.75 15.5A9.75 9.75 0 1 1 8.5 2.25a.75.75 0 0 1 .88.98 8.25 8.25 0 0 0 11.39 11.39.75.75 0 0 1 .98.88Z" />
        </svg>
      </button>
    </div>
  );
}
