// A fast, mutable board for the bot. The main engine (../game/engine.ts) is
// written to be clear and immutable; a search that looks at millions of
// positions needs something cheaper, so this mirrors the same rules with
// small integers and make/unmake instead of copying boards.
//
// Square value: 0 = empty, +code = White piece, -code = Black piece, where
// code = index in PIECES + 1 (code 1 is always the king).

import { type Board, type Color, colOf, rowOf } from "../game/engine";
import { BOARD_SIZE, KING_DEF, POOL, type PieceDef } from "../game/pieces";

export const PIECES: PieceDef[] = [KING_DEF, ...POOL];
export const KING_CODE = 1;
export const CODE_OF_N = new Map(PIECES.map((d, i) => [d.n, i + 1]));
export const N_OF_CODE = [0, ...PIECES.map((d) => d.n)];

const SQUARES = BOARD_SIZE * BOARD_SIZE;

/** TARGETS[code][sq] = squares that piece can jump to from sq on an empty board. */
export const TARGETS: number[][][] = [[]];
for (const def of PIECES) {
  const perSquare: number[][] = [];
  for (let sq = 0; sq < SQUARES; sq++) {
    const r = rowOf(sq);
    const c = colOf(sq);
    const list: number[] = [];
    for (const [dx, dy] of def.vectors) {
      const rr = r + dy;
      const cc = c + dx;
      if (rr >= 0 && cc >= 0 && rr < BOARD_SIZE && cc < BOARD_SIZE) list.push(rr * BOARD_SIZE + cc);
    }
    perSquare.push(list);
  }
  TARGETS.push(perSquare);
}

export interface Position {
  sq: Int8Array;
  /** +1 White to move, -1 Black to move. */
  side: 1 | -1;
  /** King squares, indexed [white, black]. */
  kings: [number, number];
}

export const sideIndex = (side: number) => (side === 1 ? 0 : 1);

export function fromBoard(board: Board, turn: Color): Position {
  const sq = new Int8Array(SQUARES);
  const kings: [number, number] = [-1, -1];
  board.forEach((p, i) => {
    if (!p) return;
    const code = CODE_OF_N.get(p.n)!;
    sq[i] = p.color === "w" ? code : -code;
    if (code === KING_CODE) kings[p.color === "w" ? 0 : 1] = i;
  });
  return { sq, side: turn === "w" ? 1 : -1, kings };
}

/** Is square `s` attacked by pieces of `by` (+1/-1)? Every move set is symmetric, so look outward from s. */
export function attacked(pos: Position, s: number, by: number): boolean {
  const board = pos.sq;
  for (let code = 1; code < TARGETS.length; code++) {
    const want = code * by;
    const list = TARGETS[code][s];
    for (let i = 0; i < list.length; i++) if (board[list[i]] === want) return true;
  }
  return false;
}

export const inCheck = (pos: Position, side: number) => attacked(pos, pos.kings[sideIndex(side)], -side);

/** A move packed into one number: from | to << 6 | captured-code << 12 (captured stored +16 so it is never negative). */
export const packMove = (from: number, to: number, captured: number) => from | (to << 6) | ((captured + 16) << 12);
export const moveFrom = (m: number) => m & 63;
export const moveTo = (m: number) => (m >> 6) & 63;
export const moveCaptured = (m: number) => ((m >> 12) & 31) - 16;

/** All moves that don't land on a friendly piece (may leave the king in check). */
export function pseudoMoves(pos: Position, capturesOnly = false): number[] {
  const out: number[] = [];
  const board = pos.sq;
  const side = pos.side;
  for (let from = 0; from < SQUARES; from++) {
    const v = board[from];
    if (v * side <= 0) continue;
    const list = TARGETS[v * side][from];
    for (let i = 0; i < list.length; i++) {
      const to = list[i];
      const t = board[to];
      if (t * side > 0) continue;
      if (capturesOnly && t === 0) continue;
      out.push(packMove(from, to, t));
    }
  }
  return out;
}

export function makeMove(pos: Position, m: number) {
  const from = moveFrom(m);
  const to = moveTo(m);
  const v = pos.sq[from];
  pos.sq[to] = v;
  pos.sq[from] = 0;
  if (v * pos.side === KING_CODE) pos.kings[sideIndex(pos.side)] = to;
  pos.side = -pos.side as 1 | -1;
}

export function unmakeMove(pos: Position, m: number) {
  pos.side = -pos.side as 1 | -1;
  const from = moveFrom(m);
  const to = moveTo(m);
  const v = pos.sq[to];
  pos.sq[from] = v;
  pos.sq[to] = moveCaptured(m);
  if (v * pos.side === KING_CODE) pos.kings[sideIndex(pos.side)] = from;
}

/** Fully legal moves for the side to move. */
export function legalMoves(pos: Position, capturesOnly = false): number[] {
  const side = pos.side;
  return pseudoMoves(pos, capturesOnly).filter((m) => {
    makeMove(pos, m);
    const ok = !attacked(pos, pos.kings[sideIndex(side)], -side);
    unmakeMove(pos, m);
    return ok;
  });
}
