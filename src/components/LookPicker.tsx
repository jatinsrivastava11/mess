"use client";

import { useState } from "react";
import { PieceLabel } from "./PieceLabel";

const LOOKS = [
  { id: "neon", label: "Neon", blurb: "A glowing glass board, seen from above." },
  { id: "classic", label: "Classic", blurb: "Warm paper and slate." },
  { id: "chalk", label: "Chalkboard", blurb: "Chalk on a green board." },
  { id: "blueprint", label: "Blueprint", blurb: "Ink on graph paper. A blueprint in dark mode." },
] as const;

type Look = (typeof LOOKS)[number]["id"];

/** A 4×4 corner of the board, drawn in the given look (data-look scopes the colours to this preview). */
function Preview({ look }: { look: Look }) {
  const piece = (color: "w" | "b", n: number) => (
    <span
      className="flex aspect-square w-[78%] items-center justify-center rounded-full font-math text-[11px] font-semibold"
      style={{
        background: `var(--piece-${color}-bg)`,
        color: `var(--piece-${color}-fg)`,
        border: `1.5px solid var(--piece-${color}-ring)`,
        textShadow: "var(--piece-glow)",
        boxShadow: `var(--piece-${color}-shadow)`,
      }}
    >
      <PieceLabel n={n} />
    </span>
  );
  return (
    <div data-look={look} className="rounded-lg p-2" style={{ background: "var(--bg-pattern), var(--bg)" }}>
      <div className="grid grid-cols-4 overflow-hidden rounded" style={{ boxShadow: "var(--board-shadow)" }}>
        {Array.from({ length: 16 }, (_, i) => {
          const dark = (Math.floor(i / 4) + i) % 2 === 1;
          return (
            <span
              key={i}
              className="flex aspect-square items-center justify-center"
              style={{
                background: dark ? "var(--sq-dark)" : "var(--sq-light)",
                boxShadow: "inset 0 0 0 0.5px var(--sq-line), inset 0 0 6px var(--sq-glow)",
              }}
            >
              {i === 1 && piece("b", 13)}
              {i === 6 && piece("b", 1)}
              {i === 9 && piece("w", 5)}
              {i === 14 && piece("w", 2)}
            </span>
          );
        })}
      </div>
      <p
        className="mt-2 text-center text-sm font-bold"
        style={{ fontFamily: "var(--display-font)", color: "var(--fg)", textShadow: "var(--title-glow)" }}
      >
        mess
      </p>
    </div>
  );
}

/** Settings → Look. Saved on this device and applied before the page paints on the next visit. */
export function LookPicker() {
  const [look, setLook] = useState<Look>(() => (document.documentElement.dataset.look as Look | undefined) ?? "neon");

  function choose(id: Look) {
    setLook(id);
    document.documentElement.setAttribute("data-look", id);
    try {
      localStorage.setItem("mess-look", id);
    } catch {}
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Look">
      {LOOKS.map((l) => (
        <button
          key={l.id}
          role="radio"
          aria-checked={look === l.id}
          onClick={() => choose(l.id)}
          className={`rounded-xl border p-1.5 text-left transition ${
            look === l.id ? "border-accent ring-2 ring-accent" : "border-panel-border hover:bg-fg/5"
          }`}
        >
          <Preview look={l.id} />
          <span className="mt-1.5 block px-1 text-sm font-medium">{l.label}</span>
          <span className="block px-1 pb-1 text-xs text-muted">{l.blurb}</span>
        </button>
      ))}
    </div>
  );
}
