"use client";

import { ClipLoader } from "react-spinners";

export function LoadingPopup({ message = "Please wait..." }: { message?: string }) {
  return (
    <div className="loading-popup-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-popup-card">
        <ClipLoader size={34} color="#111827" aria-label="Loading" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
