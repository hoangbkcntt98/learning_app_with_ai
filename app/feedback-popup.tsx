"use client";

type FeedbackPopupProps = {
  isOpen: boolean;
  title?: string;
  message: string;
  imageSrc: string;
  imageAlt: string;
  onClose: () => void;
  tone?: "success" | "error";
};

export function FeedbackPopup({
  isOpen,
  title,
  message,
  imageSrc,
  imageAlt,
  onClose,
  tone = "success",
}: FeedbackPopupProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="loading-popup-overlay" role="dialog" aria-modal="true">
      <div className="loading-popup-card min-w-[260px]">
        {/* Reusable feedback popup for result-style messages across the app. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-28 w-28 rounded-lg object-cover"
        />
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        <p
          className={`text-base font-semibold ${
            tone === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
