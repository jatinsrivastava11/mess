// Checks that each bot level is really stronger than the one below it.
// Games still going after 160 moves are judged on material (a clear lead wins),
// because most mess games between careful players end in no-capture draws.
// Run: npm run bot:levels   (HARD_MS=300 by default; the site gives Hard 1500 ms,
// so the real Hard is stronger than what this measures.)

import { mulberry32 } from "../src/lib/game/rng";
import { fromBoard, moveFrom, moveTo } from "../src/lib/bot/board";
import { buildTables } from "../src/lib/bot/evaluate";
import { bestMove, chooseMove } from "../src/lib/bot/search";
import { TRAINED_WEIGHTS } from "../src/lib/bot/weights";
import { type Player, matchDetails } from "./arena";

const tables = buildTables(TRAINED_WEIGHTS);
const HARD_MS = Number(process.env.HARD_MS ?? 300);
const rand = mulberry32(99);

const easy: Player = (g) => chooseMove(g, "easy", rand, tables);
const medium: Player = (g) => chooseMove(g, "medium", rand, tables);
const hard: Player = (g) => {
  const r = bestMove(fromBoard(g.board, g.turn), tables, { timeMs: HARD_MS });
  return { from: moveFrom(r.move), to: moveTo(r.move) };
};

const seeds = (n: number, base: number) => Array.from({ length: n }, (_, i) => base + i);

for (const [name, a, b, n] of [
  ["Medium vs Easy", medium, easy, 30],
  ["Hard vs Medium", hard, medium, 12],
  ["Hard vs Easy", hard, easy, 8],
] as const) {
  const t0 = Date.now();
  const r = matchDetails(a, b, seeds(n, 500_000), tables);
  console.log(
    `${name}: ${(r.score * 100).toFixed(0)}%  (won ${r.wins}, drew ${r.draws}, lost ${r.losses} of ${n * 2}; ${((Date.now() - t0) / 1000).toFixed(0)}s)`,
  );
}
