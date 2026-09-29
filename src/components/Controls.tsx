"use client";

import type { ReactNode } from "react";
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
