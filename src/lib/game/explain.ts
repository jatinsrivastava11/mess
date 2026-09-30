// Explains why a move isn't allowed, without giving away where the piece CAN
// go. It only talks about the square the player tried and the rule it broke.

import { type GameState, colOf, inCheck, legalTargets, rowOf } from "./engine";
import { KING, labelFor, pieceDef } from "./pieces";

export function explainIllegal(game: GameState, from: number, to: number): string {
  const piece = game.board[from];
  if (!piece) return "There's no piece there.";
  if (piece.color !== game.turn) return "That's not your piece.";
  if (from === to) return "Pick a different square.";
  if (legalTargets(game, from).includes(to)) return ""; // it's legal

  const target = game.board[to];
  if (target && target.color === piece.color) return "Your own piece is already on that square.";

  const across = Math.abs(colOf(to) - colOf(from));
  const up = Math.abs(rowOf(to) - rowOf(from));
  const name = labelFor(piece.n);
  const squares = (n: number) => `${n} square${n === 1 ? "" : "s"}`;

  // The shape is right, so the problem must be the king. (Every piece jumps, so there are no
  // pins: moving one piece never opens a line onto your king. Only these two cases remain.)
  if (pieceDef(piece.n).vectors.some(([dx, dy]) => Math.abs(dx) === across && Math.abs(dy) === up)) {
    if (piece.n === KING) return "The king can't step onto a square that's attacked.";
    if (inCheck(game.board, piece.color)) return "Your king is in check, and that move doesn't get it out.";
    return "That move isn't allowed.";
  }

  if (piece.n === KING) return "The king steps just one square at a time.";

  const [a, b] = [across, up].sort((x, y) => x - y);
  // Equal sides move straight, never diagonally.
  if (a === b && a * a + b * b === piece.n) {
    return `${name} has two equal sides (${a} and ${a}), so it moves in a straight line, not diagonally.`;
  }
  if (a === 0) {
    return `That square is ${squares(b)} in a straight line: 0² + ${b}² = ${b * b}, but this piece is ${name}.`;
  }
  return `That square is ${squares(across)} across and ${squares(up)} up or down: ${across}² + ${up}² = ${across * across + up * up}, but this piece is ${name}.`;
}
