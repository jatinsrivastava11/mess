import { describe, expect, it } from "vitest";
import type { Board, GameState } from "./engine";
import { explainIllegal } from "./explain";

const sq = (name: string) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]);

function position(pieces: Record<string, string>, turn: "w" | "b" = "w"): GameState {
  const board: Board = Array(64).fill(null);
  for (const [name, code] of Object.entries(pieces)) {
    board[sq(name)] = { color: code[0] as "w" | "b", n: Number(code.slice(1)) };
  }
  return { seed: 0, board, turn, quietMoves: 0, history: [], status: { kind: "playing" } };
}

describe("why a move is illegal", () => {
  it("shows the maths of the square tried, not where the piece can go", () => {
    const g = position({ d4: "w13", a1: "w1", h8: "b1" });
    const msg = explainIllegal(g, sq("d4"), sq("e8")); // 1 across, 4 up
    expect(msg).toBe("That square is 1 square across and 4 squares up or down: 1² + 4² = 17, but this piece is √13.");
    // Never mentions a legal destination or the piece's own legs.
    expect(msg).not.toMatch(/2² \+ 3²|can move|try/i);
  });

  it("explains straight lines", () => {
    const g = position({ d4: "w13", a1: "w1", h8: "b1" });
    expect(explainIllegal(g, sq("d4"), sq("d6"))).toBe("That square is 2 squares in a straight line: 0² + 2² = 4, but this piece is √13.");
  });

  it("reminds that equal sides move straight", () => {
    const g = position({ d4: "w8", a1: "w1", h8: "b1" });
    expect(explainIllegal(g, sq("d4"), sq("f6"))).toMatch(/equal sides \(2 and 2\), so it moves in a straight line/);
  });

  it("covers own pieces, the king's step, and whose turn it is", () => {
    const g = position({ d4: "w5", e6: "w2", a1: "w1", h8: "b1" });
    expect(explainIllegal(g, sq("d4"), sq("e6"))).toBe("Your own piece is already on that square.");
    expect(explainIllegal(g, sq("a1"), sq("a3"))).toBe("The king steps just one square at a time.");
    expect(explainIllegal(g, sq("h8"), sq("h7"))).toBe("That's not your piece.");
  });

  it("explains check without revealing the escape", () => {
    // Black √8 on d6 jumps 2 in a straight line, so it attacks the white king on d4.
    const g = position({ d4: "w1", h1: "w5", d6: "b8", h8: "b1" });
    expect(explainIllegal(g, sq("h1"), sq("g3"))).toBe("Your king is in check, and that move doesn't get it out.");
  });

  it("won't let the king step onto an attacked square", () => {
    // Black √8 on e5 attacks e3; the white king on e2 isn't in check yet.
    const g = position({ e2: "w1", e5: "b8", h8: "b1" });
    expect(explainIllegal(g, sq("e2"), sq("e3"))).toBe("The king can't step onto a square that's attacked.");
  });

  it("says nothing for a legal move", () => {
    const g = position({ d4: "w5", a1: "w1", h8: "b1" });
    expect(explainIllegal(g, sq("d4"), sq("e6"))).toBe("");
  });
});
