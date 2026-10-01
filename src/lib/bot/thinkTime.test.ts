import { describe, expect, it } from "vitest";
import { thinkTime } from "./thinkTime";

const TEN_MIN = 600_000;

describe("bot think time", () => {
  it("takes a level-dependent pause with plenty of time on the clock", () => {
    expect(thinkTime("easy", 30, TEN_MIN, () => 0).totalMs).toBe(1000);
    expect(thinkTime("easy", 30, TEN_MIN, () => 0.999).totalMs).toBeCloseTo(2500, -1);
    expect(thinkTime("medium", 30, TEN_MIN, () => 0.5).totalMs).toBe(2500);
    expect(thinkTime("hard", 30, TEN_MIN, () => 0.5).totalMs).toBe(3250);
  });

  it("plays a forced move quickly", () => {
    expect(thinkTime("hard", 1, TEN_MIN, () => 0.9).totalMs).toBe(600);
  });

  it("never spends more than 5% of its remaining clock", () => {
    // 20 seconds left → at most 1 second per move.
    expect(thinkTime("hard", 30, 20_000, () => 0.9).totalMs).toBe(1000);
    // Almost out of time → the floor of 0.3 s.
    expect(thinkTime("medium", 30, 2_000, () => 0.9).totalMs).toBe(300);
  });

  it("gives Hard's search most of the time, up to 1.5 s", () => {
    expect(thinkTime("hard", 30, TEN_MIN, () => 0.9).searchMs).toBe(1500);
    expect(thinkTime("hard", 30, 20_000, () => 0.9).searchMs).toBe(800);
    expect(thinkTime("hard", 30, 2_000, () => 0.9).searchMs).toBe(240);
  });
});
