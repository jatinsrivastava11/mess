import { describe, expect, it } from "vitest";
import {
  type Board,
  type GameState,
  generateBoard,
  inCheck,
  legalTargets,
  makeMove,
  newGame,
  QUIET_MOVE_LIMIT,
  rootSum,
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
  it("contains exactly the true-triangle pieces that can move from every square", () => {
    expect(POOL.map((p) => p.label)).toEqual(["√2", "√5", "√8", "√10", "√13", "√17", "√18", "√20", "5", "√32"]);
  });

  it("drops zero-length legs: 5 = √25 keeps (3,4) but not (0,5), and there is no 2, 3 or 4", () => {
    expect(pieceDef(25).legs).toEqual([[3, 4]]);
    expect(pieceDef(25).vectors).toHaveLength(8);
    const ns = POOL.map((p) => p.n);
    for (const n of [4, 9, 16]) expect(ns).not.toContain(n);
  });

  it("moves equal-leg pieces in straight lines", () => {
    const sorted = (n: number) => [...pieceDef(n).vectors].map(String).sort();
    expect(sorted(2)).toEqual(["-1,0", "0,-1", "0,1", "1,0"]);
    expect(sorted(18)).toEqual(["-3,0", "0,-3", "0,3", "3,0"]);
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
    expect(computePool(12).length).toBeGreaterThan(2 * POOL.length);
  });
});

describe("board generation", () => {
  it("is deterministic per seed and gives each side one king plus 14 pieces on its back two rows", () => {
    const a = generateBoard(42);
    expect(generateBoard(42)).toEqual(a);
    for (const color of ["w", "b"] as const) {
      const mine = a.filter((p) => p?.color === color);
      expect(mine).toHaveLength(15);
      expect(mine.filter((p) => p!.n === KING)).toHaveLength(1);
    }
    expect(a.slice(0, 16).filter((p) => p?.color === "b")).toHaveLength(15);
    expect(a.slice(48, 64).filter((p) => p?.color === "w")).toHaveLength(15);
    expect(a.slice(16, 48).every((p) => p === null)).toBe(true);
    // Kings start on the very back row, with the square in front of them empty.
    const bk = a.findIndex((p) => p?.n === KING && p.color === "b");
    const wk = a.findIndex((p) => p?.n === KING && p.color === "w");
    expect(bk).toBeLessThan(8);
    expect(wk).toBeGreaterThanOrEqual(56);
    expect(a[bk + 8]).toBeNull();
    expect(a[wk - 8]).toBeNull();
  });

  it("never lets White checkmate on the very first move", () => {
    const moves = (g: GameState) => g.board.flatMap((_, f) => legalTargets(g, f).map((t) => [f, t] as const));
    // 40 setups keeps the suite fast; a 300-setup measurement found 0 first-move mates.
    for (let seed = 0; seed < 40; seed++) {
      const g = newGame(seed);
      expect(moves(g).some(([f, t]) => makeMove(g, f, t).status.kind === "checkmate")).toBe(false);
    }
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

  it("√2 steps one square in a straight line, not diagonally", () => {
    const g = position({ d4: "w2", a1: "w1", h8: "b1" });
    expect(legalTargets(g, sq("d4")).map(squareName).sort()).toEqual(["c4", "d3", "d5", "e4"]);
  });

  it("the king steps one square in any direction", () => {
    const g = position({ d4: "w1", h8: "b1" });
    expect(legalTargets(g, sq("d4"))).toHaveLength(8);
  });

  it("cannot capture your own pieces or move into check", () => {
    // Black √8 on d6 attacks d4, d8, b6, f6.
    const g = position({ d3: "w1", e4: "w2", d6: "b8", h8: "b1" });
    const kingMoves = legalTargets(g, sq("d3")).map(squareName);
    expect(kingMoves).not.toContain("e4");
    expect(kingMoves).not.toContain("d4");
  });

  it("ends the game on checkmate", () => {
    // Codes are color + n, so "w8" is White's 2 (√4), which jumps 2 squares in a straight line.
    // The 2 on a4 jumps to a6 and checks a8; c7, d7 and d8 cover a7, b7 and b8.
    const g = position({ a8: "b1", a4: "w8", c7: "w8", d7: "w8", d8: "w8", h1: "w1" });
    const after = makeMove(g, sq("a4"), sq("a6"));
    expect(inCheck(after.board, "b")).toBe(true);
    expect(after.status).toEqual({ kind: "checkmate", winner: "w" });
  });

  it("detects stalemate", () => {
    // Black king on a8 is not attacked, but a7 (from a5), b7 (from b5) and b8 (from d8) are.
    const g = position({ a8: "b1", a5: "w8", b5: "w8", d8: "w8", h1: "w1" });
    const after = makeMove(g, sq("h1"), sq("h2"));
    expect(inCheck(after.board, "b")).toBe(false);
    expect(after.status).toEqual({ kind: "stalemate" });
  });

  it("decides on maths points after 50 moves each without a capture", () => {
    // White: √5 + √2 ≈ 3.65. Black: 5 = √25 = 5. Black has more points.
    const g = { ...position({ a1: "w1", c3: "w5", h1: "w2", h8: "b1", a8: "b25" }), quietMoves: QUIET_MOVE_LIMIT - 1 };
    const after = makeMove(g, sq("a1"), sq("a2"));
    expect(after.status).toMatchObject({ kind: "points", winner: "b" });
    if (after.status.kind === "points") expect(after.status.b).toBeCloseTo(5);
  });

  it("draws on equal maths points", () => {
    const g = { ...position({ a1: "w1", c3: "w5", h8: "b1", a6: "b5" }), quietMoves: QUIET_MOVE_LIMIT - 1 };
    expect(makeMove(g, sq("a1"), sq("a2")).status).toEqual({ kind: "draw", reason: "no-captures" });
  });

  it("adds up √n for each side, ignoring the king", () => {
    const g = position({ a1: "w1", b1: "w2", c1: "w8", h8: "b1" });
    expect(rootSum(g.board, "w")).toBeCloseTo(Math.SQRT2 + Math.sqrt(8));
    expect(rootSum(g.board, "b")).toBe(0);
  });

  it("declares a draw when only kings remain", () => {
    // Black's king takes White's last undefended piece.
    const g = position({ a8: "b1", b7: "w2", h1: "w1" }, "b");
    const after = makeMove(g, sq("a8"), sq("b7"));
    expect(after.status).toEqual({ kind: "draw", reason: "only-kings" });
  });
});
