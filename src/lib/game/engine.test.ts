import { describe, expect, it } from "vitest";
import {
  type Board,
  type GameState,
  generateBoard,
  inCheck,
  legalTargets,
  makeMove,
  newGame,
  squareName,
} from "./engine";
import { KING, POOL, computePool, pieceDef } from "./pieces";

const sq = (name: string) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]);

function position(pieces: Record<string, string>, turn: "w" | "b" = "w"): GameState {
  const board: Board = Array(64).fill(null);
  for (const [name, code] of Object.entries(pieces)) {
    board[sq(name)] = { color: code[0] as "w" | "b", n: Number(code.slice(1)) };
  }
  return { seed: 0, board, turn, quietMoves: 0, history: [], status: { kind: "playing" } };
}

describe("piece pool", () => {
  it("contains exactly the pieces that can move from every square", () => {
    expect(POOL.map((p) => p.label)).toEqual([
      "√2", "2", "√5", "√8", "3", "√10", "√13", "4", "√17", "√18", "√20", "5", "√32",
    ]);
  });

  it("gives 5 = √25 every way of writing 25 as a sum of two squares", () => {
    expect(pieceDef(25).legs).toEqual([[0, 5], [3, 4]]);
    expect(pieceDef(25).vectors).toHaveLength(12);
  });

  it("excludes √3 (not a sum of two squares) and pieces with a leg over 4", () => {
    const ns = POOL.map((p) => p.n);
    expect(ns).not.toContain(3);
    expect(ns).not.toContain(26);
    expect(ns).not.toContain(KING);
  });

  it("scales with board size", () => {
    // On 3×3 only √2 can move from the centre square.
    expect(computePool(3).map((p) => p.n)).toEqual([2]);
  });
});

describe("board generation", () => {
  it("is deterministic per seed and gives each side one king plus 7 pieces", () => {
    const a = generateBoard(42);
    expect(generateBoard(42)).toEqual(a);
    for (const color of ["w", "b"] as const) {
      const mine = a.filter((p) => p?.color === color);
      expect(mine).toHaveLength(8);
      expect(mine.filter((p) => p!.n === KING)).toHaveLength(1);
    }
    expect(a.slice(8, 56).every((p) => p === null)).toBe(true);
  });

  it("never starts in check", () => {
    for (let seed = 0; seed < 500; seed++) {
      const g = newGame(seed);
      expect(inCheck(g.board, "w")).toBe(false);
      expect(inCheck(g.board, "b")).toBe(false);
    }
  });
});

describe("moves", () => {
  it("√5 moves like a knight and jumps over pieces", () => {
    const g = position({ d4: "w5", d5: "b2", e5: "b2", c5: "b2", a1: "w1", h8: "b1" });
    expect(legalTargets(g, sq("d4")).map(squareName).sort()).toEqual(
      ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"],
    );
  });

  it("the king steps one square in any direction", () => {
    const g = position({ d4: "w1", h8: "b1" });
    expect(legalTargets(g, sq("d4"))).toHaveLength(8);
  });

  it("cannot capture your own pieces or move into check", () => {
    // Black 2 on d6 attacks d4, d8, b6, f6.
    const g = position({ d3: "w1", e4: "w2", d6: "b4", h8: "b1" });
    const kingMoves = legalTargets(g, sq("d3")).map(squareName);
    expect(kingMoves).not.toContain("e4");
    expect(kingMoves).not.toContain("d4");
  });

  it("ends the game on checkmate", () => {
    // Codes are color + n, so "w4" is White's 2 (√4), which jumps 2 squares in a straight line.
    // The 2 on a4 jumps to a6 and checks a8; c7, d7 and d8 cover a7, b7 and b8.
    const g = position({ a8: "b1", a4: "w4", c7: "w4", d7: "w4", d8: "w4", h1: "w1" });
    const after = makeMove(g, sq("a4"), sq("a6"));
    expect(inCheck(after.board, "b")).toBe(true);
    expect(after.status).toEqual({ kind: "checkmate", winner: "w" });
  });

  it("detects stalemate", () => {
    // Black king on a8 is not attacked, but a7 (from a5), b7 (from b5) and b8 (from d8) are.
    const g = position({ a8: "b1", a5: "w4", b5: "w4", d8: "w4", h1: "w1" });
    const after = makeMove(g, sq("h1"), sq("h2"));
    expect(inCheck(after.board, "b")).toBe(false);
    expect(after.status).toEqual({ kind: "stalemate" });
  });

  it("declares a draw when only kings remain", () => {
    // Black's king takes White's last undefended piece.
    const g = position({ a8: "b1", b7: "w2", h1: "w1" }, "b");
    const after = makeMove(g, sq("a8"), sq("b7"));
    expect(after.status).toEqual({ kind: "draw", reason: "only-kings" });
  });
});
