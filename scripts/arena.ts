// Bot-vs-bot games, used by training and by the level check.
import { type GameState, makeMove, newGame } from "../src/lib/game/engine";
import { fromBoard, moveFrom, moveTo } from "../src/lib/bot/board";
import { type Tables, evaluate } from "../src/lib/bot/evaluate";
import { bestMove } from "../src/lib/bot/search";

export type Player = (game: GameState) => { from: number; to: number } | null;

export const searcher =
  (tables: Tables, depth: number): Player =>
  (game) => {
    const r = bestMove(fromBoard(game.board, game.turn), tables, { maxDepth: depth });
    return r.move === undefined ? null : { from: moveFrom(r.move), to: moveTo(r.move) };
  };

/**
 * Plays one game and returns White's score (1 win, 0.5 draw, 0 loss). Games
 * still running after `maxPlies` are judged by `judge` (a clear material lead wins).
 */
export function playGame(seed: number, white: Player, black: Player, judge: Tables, maxPlies = 160): number {
  let g = newGame(seed);
  for (let ply = 0; ply < maxPlies && g.status.kind === "playing"; ply++) {
    const m = (g.turn === "w" ? white : black)(g);
    if (!m) break;
    g = makeMove(g, m.from, m.to);
  }
  const s = g.status;
  if (s.kind === "checkmate") return s.winner === "w" ? 1 : 0;
  if (s.kind !== "playing") return 0.5;
  const pos = fromBoard(g.board, g.turn);
  const whiteView = evaluate(pos, judge) * pos.side;
  return whiteView > 250 ? 1 : whiteView < -250 ? 0 : 0.5;
}

export interface MatchResult {
  score: number; // A's average score, 0..1
  wins: number;
  draws: number;
  losses: number;
}

/** A plays both colours on each seed. */
export function matchDetails(a: Player, b: Player, seeds: number[], judge: Tables): MatchResult {
  const r = { score: 0, wins: 0, draws: 0, losses: 0 };
  for (const seed of seeds) {
    for (const s of [playGame(seed, a, b, judge), 1 - playGame(seed, b, a, judge)]) {
      r.score += s;
      if (s === 1) r.wins++;
      else if (s === 0) r.losses++;
      else r.draws++;
    }
  }
  r.score /= 2 * seeds.length;
  return r;
}

export const match = (a: Player, b: Player, seeds: number[], judge: Tables) => matchDetails(a, b, seeds, judge).score;
