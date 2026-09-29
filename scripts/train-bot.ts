// Trains the bot's evaluation by self-play, "Texel tuning" style:
//
//   1. The bot plays thousands of games against itself on random boards
//      (with a little randomness so games differ).
//   2. We save quiet positions from those games together with who finally won.
//   3. The evaluation is a weighted sum of features (piece counts, mobility,
//      king danger), so we fit the weights with logistic regression: make
//      sigmoid(eval) predict the result (1 = White won, 0.5 = draw, 0 = lost).
//   4. We check the new weights in real matches against the old ones, on boards
//      training never saw, and only save them if they clearly win.
//
// Run: npm run train:bot     (GAMES=4000 npm run train:bot for more data)

import { writeFileSync } from "node:fs";
import { type GameState, makeMove, newGame } from "../src/lib/game/engine";
import { POOL } from "../src/lib/game/pieces";
import { mulberry32 } from "../src/lib/game/rng";
import { KING_CODE, PIECES, type Position, TARGETS, attacked, fromBoard, inCheck, legalMoves, moveFrom, moveTo, sideIndex } from "../src/lib/bot/board";
import { type Weights, buildTables, mobilityWeights } from "../src/lib/bot/evaluate";
import { bestMove } from "../src/lib/bot/search";
import { match, searcher } from "./arena";

const GAMES = Number(process.env.GAMES ?? 3000);
const start = mobilityWeights();
const startTables = buildTables(start);
const ns = POOL.map((p) => p.n);

// ---- 1. Self-play data -------------------------------------------------------

/** Feature vector from White's view: [count diff per piece..., mobility diff, king-danger diff]. */
function features(pos: Position): number[] {
  const f = new Array(ns.length + 2).fill(0);
  for (let s = 0; s < 64; s++) {
    const v = pos.sq[s];
    if (v === 0 || Math.abs(v) === KING_CODE) continue;
    const code = Math.abs(v);
    const sign = Math.sign(v);
    f[ns.indexOf(PIECES[code - 1].n)] += sign;
    const lens = TARGETS[code];
    const avg = lens.reduce((a, l) => a + l.length, 0) / 64;
    f[ns.length] += sign * (lens[s].length - avg);
  }
  const danger = (side: number) =>
    TARGETS[KING_CODE][pos.kings[sideIndex(side)]].filter((s) => attacked(pos, s, -side)).length;
  f[ns.length + 1] = -(danger(1) - danger(-1));
  return f;
}

const rand = mulberry32(7);
const samples: { f: number[]; result: number }[] = [];
let decisive = 0;
const t0 = Date.now();

for (let i = 0; i < GAMES; i++) {
  let g: GameState = newGame(10_000 + i);
  const positions: number[][] = [];
  for (let ply = 0; ply < 300 && g.status.kind === "playing"; ply++) {
    const pos = fromBoard(g.board, g.turn);
    // Keep quiet positions only: not in check and not right after a capture.
    const last = g.history.at(-1);
    if (ply >= 6 && !inCheck(pos, pos.side) && !last?.captured) positions.push(features(pos));
    // Mostly depth-2 best moves, sometimes a random one, so games don't repeat.
    const moves = legalMoves(pos);
    const m = rand() < 0.12 ? moves[Math.floor(rand() * moves.length)] : bestMove(pos, startTables, { maxDepth: 2 }).move;
    g = makeMove(g, moveFrom(m), moveTo(m));
  }
  const s = g.status;
  const result = s.kind === "checkmate" ? (s.winner === "w" ? 1 : 0) : 0.5;
  if (result !== 0.5) decisive++;
  // Up to 12 positions per game, spread out, so long games don't dominate.
  const step = Math.max(1, Math.floor(positions.length / 12));
  for (let j = 0; j < positions.length; j += step) samples.push({ f: positions[j], result });
  if ((i + 1) % 500 === 0) console.log(`games ${i + 1}/${GAMES}, ${samples.length} positions, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
console.log(`${decisive} of ${GAMES} games were decisive; ${samples.length} training positions`);

// ---- 2. Fit the weights (logistic regression, gradient descent) --------------

const SCALE = 200; // eval of +200 ≈ 73% expected score
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x / SCALE));
const w = [...ns.map((n) => start.values[n]), start.mobility, start.kingDanger];
const loss = () => samples.reduce((sum, { f, result }) => sum + (sigmoid(dot(w, f)) - result) ** 2, 0) / samples.length;
function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Hold back 10% of positions to check the fit isn't just memorising.
for (let i = samples.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [samples[i], samples[j]] = [samples[j], samples[i]];
}
const holdout = samples.splice(0, Math.floor(samples.length / 10));
const holdLoss = () => holdout.reduce((sum, { f, result }) => sum + (sigmoid(dot(w, f)) - result) ** 2, 0) / holdout.length;

console.log(`before: train loss ${loss().toFixed(4)}, held-out loss ${holdLoss().toFixed(4)}`);
const lr = [...ns.map(() => 4000), 60, 150];
for (let epoch = 1; epoch <= 300; epoch++) {
  const grad = new Array(w.length).fill(0);
  for (const { f, result } of samples) {
    const p = sigmoid(dot(w, f));
    const g = ((2 * (p - result) * p * (1 - p)) / SCALE) / samples.length;
    for (let i = 0; i < w.length; i++) grad[i] += g * f[i];
  }
  for (let i = 0; i < w.length; i++) w[i] = Math.max(i < ns.length ? 20 : 0, w[i] - lr[i] * grad[i]);
  if (epoch % 100 === 0) console.log(`epoch ${epoch}: train loss ${loss().toFixed(4)}, held-out loss ${holdLoss().toFixed(4)}`);
}

const trained: Weights = {
  values: Object.fromEntries(ns.map((n, i) => [n, Math.round(w[i])])),
  mobility: Math.round(w[ns.length] * 10) / 10,
  kingDanger: Math.round(w[ns.length + 1] * 10) / 10,
  mopUp: start.mopUp, // not fitted: it only switches on once someone is clearly ahead
};
console.log("learned:", ns.map((n) => `√${n}=${trained.values[n]}`).join(" "), `mob=${trained.mobility} king=${trained.kingDanger}`);

// ---- 3. Does it actually play better? ----------------------------------------

const valSeeds = Array.from({ length: 100 }, (_, i) => 900_000 + i);
const vs = (d: number) => match(searcher(buildTables(trained), d), searcher(startTables, d), valSeeds, startTables);
const s2 = vs(2);
const s3 = vs(3);
console.log(`\nTrained vs untrained, 200 games each: depth 2 → ${(s2 * 100).toFixed(1)}%, depth 3 → ${(s3 * 100).toFixed(1)}%`);

// Only keep the new weights if they clearly win (a coin flip scores 50%).
if ((s2 + s3) / 2 > 0.52) {
  writeFileSync(
    new URL("../src/lib/bot/weights.ts", import.meta.url),
    `// Evaluation weights used by the bot, learned by self-play (scripts/train-bot.ts).
// Texel tuning on ${samples.length + holdout.length} positions from ${GAMES} self-play games.
// Validation vs the untrained starting guess: ${(s2 * 100).toFixed(1)}% at depth 2,
// ${(s3 * 100).toFixed(1)}% at depth 3 (200 games each, boards unseen in training).
// Regenerate with: npm run train:bot
import type { Weights } from "./evaluate";

export const TRAINED_WEIGHTS: Weights = ${JSON.stringify(trained, null, 2)};
`,
  );
  console.log("Saved src/lib/bot/weights.ts");
} else {
  console.log("Trained weights weren't clearly better, so weights.ts was left unchanged.");
}
