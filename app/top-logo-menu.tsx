"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function TopLogoMenu() {
  const [isOpen, setIsOpen] = useState(false);
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
        </div>
      ) : null}
    </div>
  );
}
