"use client";

import Link from "next/link";

export function FeatureAccessWarning({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="loading-popup-overlay" role="dialog" aria-modal="true">
      <div className="loading-popup-card min-w-[300px]">
        {/* Shared popup warning for blocked feature route access. */}
        <p className="text-base font-semibold text-rose-700">{title}</p>
        <p className="text-sm text-black/70">{message}</p>
        <Link
          href="/"
          className="mt-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          OK
        </Link>
      </div>
    </div>
  );
}
