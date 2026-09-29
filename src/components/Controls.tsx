"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type Clock, timeLeft } from "@/lib/game/clock";
import type { Color } from "@/lib/game/engine";

export const colorName = (c: Color) => (c === "w" ? "White" : "Black");

/** mm:ss, switching to ss.t in the last 20 seconds. */
function formatClock(ms: number) {
  if (ms < 20_000) return (Math.floor(ms / 100) / 10).toFixed(1);
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function ClockFace({ color, clock, now, label }: { color: Color; clock: Clock; now: number; label?: string }) {
  const ms = timeLeft(clock, color, now);
  const active = clock.running === color;
  const low = ms < 20_000;
  return (
    <div
      className={`flex min-w-32 items-center justify-between gap-3 rounded-xl border px-3 py-1.5 shadow-sm transition ${
        active ? "border-fg bg-fg text-bg" : "border-panel-border bg-panel text-muted"
      }`}
      aria-label={`${colorName(color)} clock`}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium">
        <span
          className="h-2.5 w-2.5 rounded-full ring-1 ring-current"
          style={{ background: color === "w" ? "var(--piece-w-bg)" : "var(--piece-b-bg)" }}
        />
        <span className="max-w-24 truncate">{label ?? colorName(color)}</span>
      </span>
      <span className={`font-mono text-lg tabular-nums ${low && active ? "text-red-500" : ""}`}>{formatClock(ms)}</span>
    </div>
  );
}

export function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border sm:h-10 sm:w-10 border-panel-border bg-panel shadow-sm transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {children}
      </svg>
    </button>
  );
}

// Pure CSS: the `dark` class on <html> drives the knob position and icon, so there is no state to sync.
export function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("mess-theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="relative flex h-8 w-14 items-center rounded-full border border-panel-border bg-panel px-1 shadow-sm"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fg text-bg transition-transform dark:translate-x-[22px]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <circle cx="12" cy="12" r="5" className="dark:hidden" />
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" className="hidden dark:block" />
        </svg>
      </span>
    </button>
  );
}

/** Resign in two taps: the first asks, the second confirms. It resets itself after 3 seconds. */
export function ResignFlag({ onResign }: { onResign: () => void }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const id = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(id);
  }, [confirming]);
  return (
    <button
      onClick={() => (confirming ? onResign() : setConfirming(true))}
      aria-label={confirming ? "Tap again to resign" : "Resign"}
      title={confirming ? "Tap again to resign" : "Resign"}
      className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-sm font-medium shadow-sm transition ${
        confirming ? "border-red-600 bg-red-600 text-white" : "border-panel-border bg-panel text-muted hover:text-fg"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
      </svg>
      {confirming && <span>Resign?</span>}
    </button>
  );
}
