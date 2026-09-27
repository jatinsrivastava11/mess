// Chess clock: each player has their own time bank, and only the player to
// move is losing time. Stored as "time left when the current turn began" plus
// the moment it began, so it never drifts and works the same on any device.

import type { Color } from "./engine";

export const TIME_CONTROLS_MIN = [3, 5, 10] as const;
export type TimeControl = (typeof TIME_CONTROLS_MIN)[number];

export interface Clock {
  remaining: Record<Color, number>;
  /** Whose clock is ticking, or null when stopped. */
  running: Color | null;
  /** Timestamp (ms) when the running clock last started. */
  since: number;
}

export function startClock(minutes: number, now: number): Clock {
  const ms = minutes * 60_000;
  return { remaining: { w: ms, b: ms }, running: "w", since: now };
}

export function timeLeft(clock: Clock, color: Color, now: number): number {
  const spent = clock.running === color ? now - clock.since : 0;
  return Math.max(0, clock.remaining[color] - spent);
}

/** The player who just moved presses their clock: their time is banked and the other clock starts. */
export function pressClock(clock: Clock, now: number): Clock {
  if (!clock.running) return clock;
  const mover = clock.running;
  return {
    remaining: { ...clock.remaining, [mover]: timeLeft(clock, mover, now) },
    running: mover === "w" ? "b" : "w",
    since: now,
  };
}

export function stopClock(clock: Clock, now: number): Clock {
  if (!clock.running) return clock;
  return {
    remaining: { ...clock.remaining, [clock.running]: timeLeft(clock, clock.running, now) },
    running: null,
    since: now,
  };
}

/** The colour whose time has run out, if any. */
export function flagged(clock: Clock, now: number): Color | null {
  return clock.running && timeLeft(clock, clock.running, now) === 0 ? clock.running : null;
}
