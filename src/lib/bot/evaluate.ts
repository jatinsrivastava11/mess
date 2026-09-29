// How good is a position? A score in "points" from the side to move's view
// (positive = good for them). The numbers come from `weights.ts`, which the
// training script tunes by self-play.

import { KING_CODE, PIECES, type Position, TARGETS, attacked, sideIndex } from "./board";

export interface Weights {
  /** Value of each piece by n (e.g. { 5: 240, 13: 310 }). The king has no material value. */
  values: Record<number, number>;
  /** Bonus per extra square a piece can reach from where it stands (centre squares reach more). */
  mobility: number;
  /** Penalty per square next to your king that the enemy attacks. */
  kingDanger: number;
  /** When ahead in material: bonus for pushing the enemy king to the edge and bringing yours closer. */
  mopUp: number;
}

/** Starting guess before training: a piece is worth roughly how many squares it reaches on average. */
export function mobilityWeights(): Weights {
  const values: Record<number, number> = {};
  for (let code = 2; code <= PIECES.length; code++) {
    const reach = TARGETS[code].reduce((sum, list) => sum + list.length, 0) / TARGETS[code].length;
    values[PIECES[code - 1].n] = Math.round(45 * reach);
  }
  return { values, mobility: 6, kingDanger: 12, mopUp: 12 };
}

/** Precomputed per-code tables so evaluation is just lookups. */
export interface Tables {
  value: Int32Array; // by code
  square: Int32Array[]; // [code][sq] positional bonus
  kingDanger: number;
  mopUp: number;
}

export function buildTables(w: Weights): Tables {
  const value = new Int32Array(PIECES.length + 1);
  const square: Int32Array[] = [new Int32Array(64)];
  for (let code = 1; code <= PIECES.length; code++) {
    value[code] = code === KING_CODE ? 0 : Math.round(w.values[PIECES[code - 1].n] ?? 0);
    const lens = TARGETS[code].map((l) => l.length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    // Kings aren't rewarded for central squares; they're safer tucked away.
    square.push(Int32Array.from(lens, (n) => (code === KING_CODE ? 0 : Math.round(w.mobility * (n - avg)))));
  }
  return { value, square, kingDanger: w.kingDanger, mopUp: w.mopUp };
}

function kingDanger(pos: Position, side: number): number {
  const k = pos.kings[sideIndex(side)];
  let n = 0;
  for (const s of TARGETS[KING_CODE][k]) if (attacked(pos, s, -side)) n++;
  return n;
}

/** Rings from the centre: 0 on the four centre squares, 3 on the edge. */
const edgeness = (sq: number) => Math.max(Math.abs((sq >> 3) - 3.5), Math.abs((sq & 7) - 3.5)) - 0.5;
const kingDistance = (a: number, b: number) => Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));

/** Score from White's view. */
export function evaluateWhite(pos: Position, t: Tables): number {
  let material = 0;
  let positional = 0;
  const board = pos.sq;
  for (let s = 0; s < 64; s++) {
    const v = board[s];
    if (v === 0) continue;
    const code = v > 0 ? v : -v;
    const sign = v > 0 ? 1 : -1;
    material += sign * t.value[code];
    positional += sign * t.square[code][s];
  }
  let score = material + positional;
  score -= t.kingDanger * (kingDanger(pos, 1) - kingDanger(pos, -1));

  // Mop-up: only matters once someone is clearly ahead.
  if (t.mopUp && Math.abs(material) >= 150) {
    const winner = material > 0 ? 1 : -1;
    const loserKing = pos.kings[sideIndex(-winner)];
    const winnerKing = pos.kings[sideIndex(winner)];
    score += winner * t.mopUp * (2 * edgeness(loserKing) + (7 - kingDistance(loserKing, winnerKing)) / 2);
  }
  return score;
}

export function evaluate(pos: Position, t: Tables): number {
  return evaluateWhite(pos, t) * pos.side;
}

/** Only kings left: nobody can win. */
export function onlyKings(pos: Position): boolean {
  for (let s = 0; s < 64; s++) {
    const v = pos.sq[s];
    if (v !== 0 && v !== KING_CODE && v !== -KING_CODE) return false;
  }
  return true;
}
