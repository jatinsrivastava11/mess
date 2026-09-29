// The bot's look-ahead: negamax with alpha-beta pruning, quiescence search on
// captures, check extensions and iterative deepening. The three levels share
// it and differ in how far they look and how often they "misjudge".

import type { GameState } from "../game/engine";
import {
  type Position,
  attacked,
  fromBoard,
  inCheck,
  legalMoves,
  makeMove,
  moveCaptured,
  moveFrom,
  moveTo,
  pseudoMoves,
  sideIndex,
  unmakeMove,
} from "./board";
import { type Tables, buildTables, evaluate, onlyKings } from "./evaluate";
import { TRAINED_WEIGHTS } from "./weights";

export type Level = "easy" | "medium" | "hard";

export const MATE = 1_000_000;
const INF = 10_000_000;
const MAX_PLY = 32;

interface Ctx {
  pos: Position;
  t: Tables;
  nodes: number;
  deadline: number;
  stopped: boolean;
  killers: number[][];
}

/** Most valuable victim, least valuable attacker first; then killer moves; then the rest. */
function order(ctx: Ctx, moves: number[], ply: number): number[] {
  const { t, pos } = ctx;
  const killers = ctx.killers[ply] ?? [];
  const score = (m: number) => {
    const cap = moveCaptured(m);
    if (cap !== 0) return 1_000_000 + t.value[Math.abs(cap)] * 16 - t.value[Math.abs(pos.sq[moveFrom(m)])];
    return killers.includes(m) ? 500_000 : 0;
  };
  return moves.map((m) => [score(m), m] as const).sort((a, b) => b[0] - a[0]).map(([, m]) => m);
}

function timeUp(ctx: Ctx) {
  if ((++ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) ctx.stopped = true;
  return ctx.stopped;
}

/** Keep resolving captures so the bot never stops thinking in the middle of a trade. */
function quiesce(ctx: Ctx, alpha: number, beta: number, depth: number): number {
  if (timeUp(ctx)) return 0;
  const stand = evaluate(ctx.pos, ctx.t);
  if (stand >= beta || depth <= 0) return stand;
  if (stand > alpha) alpha = stand;
  const side = ctx.pos.side;
  for (const m of order(ctx, pseudoMoves(ctx.pos, true), MAX_PLY - 1)) {
    makeMove(ctx.pos, m);
    if (attacked(ctx.pos, ctx.pos.kings[sideIndex(side)], -side)) {
      unmakeMove(ctx.pos, m);
      continue;
    }
    const score = -quiesce(ctx, -beta, -alpha, depth - 1);
    unmakeMove(ctx.pos, m);
    if (ctx.stopped) return 0;
    if (score >= beta) return score;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(ctx: Ctx, depth: number, alpha: number, beta: number, ply: number): number {
  if (timeUp(ctx)) return 0;
  const { pos } = ctx;
  const side = pos.side;
  const checked = inCheck(pos, side);
  if (checked && ply < MAX_PLY - 2) depth++; // look deeper when in check, so mates aren't missed
  if (depth <= 0) return quiesce(ctx, alpha, beta, 6);
  if (onlyKings(pos)) return 0;

  let legal = 0;
  let best = -INF;
  for (const m of order(ctx, pseudoMoves(pos), ply)) {
    makeMove(pos, m);
    if (attacked(pos, pos.kings[sideIndex(side)], -side)) {
      unmakeMove(pos, m);
      continue;
    }
    legal++;
    const score = -negamax(ctx, depth - 1, -beta, -alpha, ply + 1);
    unmakeMove(pos, m);
    if (ctx.stopped) return 0;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      if (moveCaptured(m) === 0) {
        const k = (ctx.killers[ply] ??= []);
        if (!k.includes(m)) {
          k.unshift(m);
          k.length = Math.min(k.length, 2);
        }
      }
      break;
    }
  }
  if (legal === 0) return checked ? -MATE + ply : 0; // checkmate or stalemate
  return best;
}

export interface Scored {
  move: number;
  score: number;
}

/** Scores every root move with a full window at a fixed depth (used by easy/medium, which choose among them). */
export function scoreAll(pos: Position, t: Tables, depth: number): Scored[] {
  const ctx: Ctx = { pos, t, nodes: 0, deadline: Infinity, stopped: false, killers: [] };
  return legalMoves(pos).map((move) => {
    makeMove(pos, move);
    const score = -negamax(ctx, depth - 1, -INF, INF, 1);
    unmakeMove(pos, move);
    return { move, score };
  });
}

/** Iterative deepening: search depth 1, 2, 3, … until time or maxDepth runs out, keeping the last finished answer. */
export function bestMove(pos: Position, t: Tables, opts: { timeMs?: number; maxDepth?: number }): Scored & { depth: number } {
  const ctx: Ctx = {
    pos,
    t,
    nodes: 0,
    deadline: opts.timeMs ? Date.now() + opts.timeMs : Infinity,
    stopped: false,
    killers: [],
  };
  let rootMoves = order(ctx, legalMoves(pos), 0);
  let result = { move: rootMoves[0], score: 0, depth: 0 };
  for (let depth = 1; depth <= (opts.maxDepth ?? 64); depth++) {
    let alpha = -INF;
    const scores = new Map<number, number>();
    for (const m of rootMoves) {
      makeMove(pos, m);
      const score = -negamax(ctx, depth - 1, -INF, -alpha, 1);
      unmakeMove(pos, m);
      if (ctx.stopped) break;
      scores.set(m, score);
      if (score > alpha) alpha = score;
    }
    if (ctx.stopped && scores.size === 0) break;
    // Partial depths still help: the best move found so far was compared against the previous best.
    const [move, score] = [...scores].sort((a, b) => b[1] - a[1])[0];
    if (!ctx.stopped || score > result.score) result = { move, score, depth };
    if (ctx.stopped) break;
    // Search the best moves first next time; stop early once a forced mate is found.
    rootMoves = [...rootMoves].sort((a, b) => (scores.get(b) ?? -INF) - (scores.get(a) ?? -INF));
    if (Math.abs(score) > MATE - 100) break;
  }
  return result;
}

const DEFAULT_TABLES = buildTables(TRAINED_WEIGHTS);

export const LEVELS: Record<Level, { label: string; blurb: string }> = {
  easy: { label: "Easy", blurb: "Looks one move ahead and often gets it wrong." },
  medium: { label: "Medium", blurb: "Looks two moves ahead and rarely blunders." },
  hard: { label: "Hard", blurb: "Thinks deeply for about a second and a half." },
};

/** Picks the bot's move for the side to move in `game`. `rand` lets tests and training be reproducible. */
export function chooseMove(
  game: GameState,
  level: Level,
  rand: () => number = Math.random,
  tables: Tables = DEFAULT_TABLES,
): { from: number; to: number } | null {
  const pos = fromBoard(game.board, game.turn);
  const moves = legalMoves(pos);
  if (moves.length === 0) return null;
  const pick = (m: number) => ({ from: moveFrom(m), to: moveTo(m) });

  if (level === "hard") return pick(bestMove(pos, tables, { timeMs: 1500 }).move);

  const depth = level === "easy" ? 1 : 2;
  const margin = level === "easy" ? 150 : 25; // how much worse than best a move may be and still be chosen
  if (level === "easy" && rand() < 0.2) return pick(moves[Math.floor(rand() * moves.length)]);
  const scored = scoreAll(pos, tables, depth);
  const top = Math.max(...scored.map((s) => s.score));
  const good = scored.filter((s) => s.score >= top - margin);
  return pick(good[Math.floor(rand() * good.length)].move);
}
