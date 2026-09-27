import { describe, expect, it } from "vitest";
import { flagged, pressClock, startClock, stopClock, timeLeft } from "./clock";

describe("chess clock", () => {
  it("only runs the clock of the player to move", () => {
    const c = startClock(5, 0);
    expect(timeLeft(c, "w", 10_000)).toBe(290_000);
    expect(timeLeft(c, "b", 10_000)).toBe(300_000);
  });

  it("banks time and switches sides when pressed", () => {
    let c = startClock(5, 0);
    c = pressClock(c, 10_000); // White spent 10s
    expect(c.running).toBe("b");
    expect(timeLeft(c, "w", 50_000)).toBe(290_000);
    expect(timeLeft(c, "b", 50_000)).toBe(260_000); // Black has spent 40s so far
    c = pressClock(c, 50_000);
    expect(timeLeft(c, "b", 99_000)).toBe(260_000);
    expect(timeLeft(c, "w", 60_000)).toBe(280_000);
  });

  it("flags the player whose time runs out", () => {
    const c = startClock(3, 0);
    expect(flagged(c, 179_999)).toBeNull();
    expect(flagged(c, 180_000)).toBe("w");
    expect(timeLeft(c, "w", 999_999)).toBe(0);
  });

  it("freezes when stopped", () => {
    const c = stopClock(startClock(3, 0), 30_000);
    expect(c.running).toBeNull();
    expect(timeLeft(c, "w", 999_999)).toBe(150_000);
    expect(flagged(c, 999_999)).toBeNull();
  });
});
