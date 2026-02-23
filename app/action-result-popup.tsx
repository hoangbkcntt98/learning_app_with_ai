"use client";

type ActionResultPopupProps = {
  isOpen: boolean;
  message: string;
  tone: "success" | "error";
  onClose: () => void;
};

export function ActionResultPopup({
  isOpen,
  message,
  tone,
  onClose,
}: ActionResultPopupProps) {
  if (!isOpen || !message) {
    return null;
  }

  return (
    <div className="loading-popup-overlay" role="dialog" aria-modal="true">
      <div className="loading-popup-card min-w-[280px]">
        {/* Reusable popup for admin create/edit/delete result feedback. */}
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
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          OK
        </button>
      </div>
    </div>
  );
}
