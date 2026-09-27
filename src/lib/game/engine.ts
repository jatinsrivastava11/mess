// Game rules: board setup, legal moves, check, checkmate, stalemate and draws.
// Everything here is pure (no React, no network) so it can be tested and shared
// between the browser and, later, the server.

import { BOARD_SIZE, KING, KING_DEF, POOL, pieceDef } from "./pieces";
import { mulberry32 } from "./rng";

export type Color = "w" | "b";

export interface Piece {
  n: number;
  color: Color;
}

/** Square index = row * 8 + col. Row 0 is the top (Black's back row). */
export type Board = (Piece | null)[];

export interface Move {
  from: number;
  to: number;
  piece: Piece;
  captured: Piece | null;
}

export type Status =
  | { kind: "playing" }
  | { kind: "checkmate"; winner: Color }
  | { kind: "resigned"; winner: Color }
  | { kind: "stalemate" }
  | { kind: "draw"; reason: "only-kings" | "no-captures" };

export interface GameState {
  seed: number;
  board: Board;
  turn: Color;
  /** Half-moves since the last capture, for the no-captures draw. */
  quietMoves: number;
  history: Move[];
  status: Status;
}

/** 50 moves each with no capture is a draw (there are no pawns, so captures are the only progress). */
export const QUIET_MOVE_LIMIT = 100;

export const other = (c: Color): Color => (c === "w" ? "b" : "w");
export const rowOf = (sq: number) => Math.floor(sq / BOARD_SIZE);
export const colOf = (sq: number) => sq % BOARD_SIZE;
const sqAt = (row: number, col: number) => row * BOARD_SIZE + col;
const onBoard = (row: number, col: number) =>
  row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE;

/**
 * Random starting position: each side gets a king on a random square of its
 * back row plus 7 pieces drawn from the pool (repeats allowed). The two sides
 * are drawn independently, so they are usually different.
 */
export function generateBoard(seed: number): Board {
  const rand = mulberry32(seed);
  const board: Board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  for (const [color, row] of [["b", 0], ["w", BOARD_SIZE - 1]] as const) {
    const kingCol = Math.floor(rand() * BOARD_SIZE);
    for (let col = 0; col < BOARD_SIZE; col++) {
      const n = col === kingCol ? KING : POOL[Math.floor(rand() * POOL.length)].n;
      board[sqAt(row, col)] = { n, color };
    }
  }
  return board;
}

export function newGame(seed: number): GameState {
  return {
    seed,
    board: generateBoard(seed),
    turn: "w",
    quietMoves: 0,
    history: [],
    status: { kind: "playing" },
  };
}

function targets(board: Board, from: number): number[] {
  const piece = board[from];
  if (!piece) return [];
  const row = rowOf(from);
  const col = colOf(from);
  const out: number[] = [];
  for (const [dx, dy] of pieceDef(piece.n).vectors) {
    const r = row + dy;
    const c = col + dx;
    if (!onBoard(r, c)) continue;
    const to = sqAt(r, c);
    if (board[to]?.color !== piece.color) out.push(to);
  }
  return out;
}

/** Is `sq` attacked by any piece of `by`? Moves are symmetric, so we look outward from `sq`. */
export function isAttacked(board: Board, sq: number, by: Color): boolean {
  const row = rowOf(sq);
  const col = colOf(sq);
  for (const def of [KING_DEF, ...POOL]) {
    for (const [dx, dy] of def.vectors) {
      const r = row + dy;
      const c = col + dx;
      if (!onBoard(r, c)) continue;
      const p = board[sqAt(r, c)];
      if (p && p.color === by && p.n === def.n) return true;
    }
  }
  return false;
}

export function kingSquare(board: Board, color: Color): number {
  return board.findIndex((p) => p?.n === KING && p.color === color);
}

export function inCheck(board: Board, color: Color): boolean {
  const k = kingSquare(board, color);
  return k >= 0 && isAttacked(board, k, other(color));
}

function play(board: Board, from: number, to: number): Board {
  const next = board.slice();
  next[to] = next[from];
  next[from] = null;
  return next;
}

/** Legal destination squares for the piece on `from` (moves that don't leave your own king in check). */
export function legalTargets(state: GameState, from: number): number[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn || state.status.kind !== "playing") return [];
  return targets(state.board, from).filter((to) => !inCheck(play(state.board, from, to), piece.color));
}

function hasAnyLegalMove(board: Board, color: Color): boolean {
  for (let from = 0; from < board.length; from++) {
    if (board[from]?.color !== color) continue;
    for (const to of targets(board, from)) {
      if (!inCheck(play(board, from, to), color)) return true;
    }
  }
  return false;
}

function statusAfter(board: Board, toMove: Color, quietMoves: number): Status {
  if (!hasAnyLegalMove(board, toMove)) {
    return inCheck(board, toMove) ? { kind: "checkmate", winner: other(toMove) } : { kind: "stalemate" };
  }
  if (board.every((p) => !p || p.n === KING)) return { kind: "draw", reason: "only-kings" };
  if (quietMoves >= QUIET_MOVE_LIMIT) return { kind: "draw", reason: "no-captures" };
  return { kind: "playing" };
}

export function makeMove(state: GameState, from: number, to: number): GameState {
  if (!legalTargets(state, from).includes(to)) throw new Error("Illegal move");
  const piece = state.board[from]!;
  const captured = state.board[to];
  const board = play(state.board, from, to);
  const turn = other(state.turn);
  const quietMoves = captured ? 0 : state.quietMoves + 1;
  return {
    ...state,
    board,
    turn,
    quietMoves,
    history: [...state.history, { from, to, piece, captured }],
    status: statusAfter(board, turn, quietMoves),
  };
}

export function resign(state: GameState, color: Color): GameState {
  if (state.status.kind !== "playing") return state;
  return { ...state, status: { kind: "resigned", winner: other(color) } };
}

/** Algebraic-style name for a square, e.g. 56 → "a1". */
export function squareName(sq: number): string {
  return `${"abcdefgh"[colOf(sq)]}${BOARD_SIZE - rowOf(sq)}`;
}
