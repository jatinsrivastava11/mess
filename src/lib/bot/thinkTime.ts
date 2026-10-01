// How long the bot "thinks" before moving in a real game, so it feels like
// playing a person rather than a machine that answers instantly. Its clock
// runs while it thinks, so this time really counts.

import type { Level } from "./search";

/** Random pause per level (ms). Hard's search runs inside this time. */
const RANGES: Record<Level, [number, number]> = {
  easy: [1000, 2500],
  medium: [1500, 3500],
  hard: [2000, 4500],
};

/** Never spend more than this share of the remaining clock on one move. */
const MAX_SHARE = 0.05;
const ONLY_MOVE_MS = 600;
const MIN_MS = 300;

/**
 * Total time the bot takes for this move, and how much of it Hard may spend searching.
 * `timeLeftMs` is the bot's own clock.
 */
export function thinkTime(
  level: Level,
  legalMoves: number,
  timeLeftMs: number,
  rand: () => number = Math.random,
): { totalMs: number; searchMs: number } {
  const [lo, hi] = RANGES[level];
  // A forced move doesn't need thought; anything else gets a random human-ish pause.
  const wanted = legalMoves <= 1 ? ONLY_MOVE_MS : lo + rand() * (hi - lo);
  // Low on time? Hurry, so the bot can't lose just by being slow.
  const totalMs = Math.round(Math.max(MIN_MS, Math.min(wanted, timeLeftMs * MAX_SHARE)));
  // Hard searches for most of that time (capped at its normal 1.5 s); the rest is the pause.
  const searchMs = Math.round(Math.max(150, Math.min(1500, totalMs * 0.8)));
  return { totalMs, searchMs };
}
