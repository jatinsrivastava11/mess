"use client";

import { type ReactNode, useEffect } from "react";

/** Popup over a blurred background. `onClose` is optional so the home popup can't be dismissed. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title?: string;
  onClose?: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-pop-in relative max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-panel-border bg-panel p-6 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-sm"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 rounded-full p-2 text-muted hover:bg-fg/10 hover:text-fg"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        )}
        {title && <h2 className="mb-4 text-xl font-semibold tracking-tight">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-fg text-bg hover:opacity-90",
    ghost: "border border-panel-border hover:bg-fg/5",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl px-4 py-3 font-medium transition disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}
