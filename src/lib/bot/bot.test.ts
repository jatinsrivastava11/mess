import { describe, expect, it } from "vitest";
import { type Board, type GameState, legalTargets, makeMove, newGame } from "../game/engine";
import { mulberry32 } from "../game/rng";
import { fromBoard, legalMoves, moveFrom, moveTo } from "./board";
import { buildTables, mobilityWeights } from "./evaluate";
import { MATE, bestMove, chooseMove } from "./search";

const sq = (name: string) => (8 - Number(name[1])) * 8 + "abcdefgh".indexOf(name[0]);

function position(pieces: Record<string, string>, turn: "w" | "b" = "w"): GameState {
  const board: Board = Array(64).fill(null);
  for (const [name, code] of Object.entries(pieces)) {
    board[sq(name)] = { color: code[0] as "w" | "b", n: Number(code.slice(1)) };
  }
  return { seed: 0, board, turn, quietMoves: 0, history: [], status: { kind: "playing" } };
}

const engineMoves = (g: GameState) =>
  g.board.flatMap((_, from) => legalTargets(g, from).map((to) => `${from}-${to}`)).sort();
const botMoves = (g: GameState) =>
  legalMoves(fromBoard(g.board, g.turn)).map((m) => `${moveFrom(m)}-${moveTo(m)}`).sort();

const tables = buildTables(mobilityWeights());

describe("bot board", () => {
  it("generates exactly the engine's legal moves across many random games", () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rand = mulberry32(seed);
      let g = newGame(seed);
      for (let ply = 0; ply < 60 && g.status.kind === "playing"; ply++) {
        const expected = engineMoves(g);
        expect(botMoves(g)).toEqual(expected);
        checked++;
        const [from, to] = expected[Math.floor(rand() * expected.length)].split("-").map(Number);
        g = makeMove(g, from, to);
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});

describe("bot search", () => {
  // √8 ("w8") jumps 2 squares in a straight line. a4→a6 is mate: c7, d7, d8 cover a7, b7, b8.
  const mateInOne = position({ a8: "b1", a4: "w8", c7: "w8", d7: "w8", d8: "w8", h1: "w1" });

  it("finds mate in one", () => {
    const r = bestMove(fromBoard(mateInOne.board, "w"), tables, { maxDepth: 3 });
    expect([moveFrom(r.move), moveTo(r.move)]).toEqual([sq("a4"), sq("a6")]);
    expect(r.score).toBeGreaterThan(MATE - 100);
  });

  it("takes a free piece", () => {
    // White √5 on d4 can take an undefended black √20 on e6.
    const g = position({ d4: "w5", e6: "b20", a1: "w1", h8: "b1" });
    const r = bestMove(fromBoard(g.board, "w"), tables, { maxDepth: 2 });
    expect([moveFrom(r.move), moveTo(r.move)]).toEqual([sq("d4"), sq("e6")]);
  });

  it("doesn't trade a valuable piece for a cheap defended one", () => {
    // White's √5 could take the black √32 on e6, but g7's √5 defends it (a knight jump), so that trade loses value.
    const g = position({ d4: "w5", e6: "b32", g7: "b5", a1: "w1", h8: "b1" });
    const r = bestMove(fromBoard(g.board, "w"), tables, { maxDepth: 3 });
    expect(moveTo(r.move)).not.toBe(sq("e6"));
  });

  it("plays for maths points at the no-capture limit", () => {
    // One quiet move from the limit. White is ahead on points (√5+√13 vs √2), so any quiet move wins on points;
    // the bot must see that as a win, not a neutral position.
    const g = { ...position({ a1: "w1", c3: "w5", e3: "w13", h8: "b1", h6: "b2" }), quietMoves: 99 };
    const r = bestMove(fromBoard(g.board, "w"), tables, { maxDepth: 2, quiet: 99 });
    expect(r.score).toBeGreaterThan(90_000);
  });

  it("every level returns a legal move", () => {
    const g = newGame(123);
    const legal = engineMoves(g);
    for (const level of ["easy", "medium"] as const) {
      for (let i = 0; i < 5; i++) {
        const m = chooseMove(g, level, mulberry32(i))!;
        expect(legal).toContain(`${m.from}-${m.to}`);
      }
    }
  });
});
