"use client";

import { useState } from "react";
import { type GameState, inCheck, kingSquare, legalTargets } from "@/lib/game/engine";
import { BOARD_SIZE, pieceDef } from "@/lib/game/pieces";
import { PieceLabel } from "./PieceLabel";

const FILES = "abcdefgh";

export function Board({
  game,
  onMove,
  interactive,
  flipped = false,
  showHints = false,
  onIllegal,
}: {
  game: GameState;
  onMove: (from: number, to: number) => void;
  interactive: boolean;
  /** Show the board from Black's side. */
  flipped?: boolean;
  /** Dots on the squares the selected piece can reach (first game and tutorials only). */
  showHints?: boolean;
  /** Called when the player tries a square the selected piece can't reach. */
  onIllegal?: (from: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const targets = selected === null || !interactive ? [] : legalTargets(game, selected);
  const last = game.history.at(-1);
  const checkedKing = inCheck(game.board, game.turn) ? kingSquare(game.board, game.turn) : -1;

  function click(sq: number) {
    if (!interactive) return;
    if (selected !== null && targets.includes(sq)) {
      onMove(selected, sq);
      setSelected(null);
      return;
    }
    const piece = game.board[sq];
    const own = piece && piece.color === game.turn;
    // Without hints, a wrong square is a real mistake worth telling the player about.
    if (selected !== null && !own && sq !== selected) onIllegal?.(selected);
    setSelected(own && sq !== selected ? sq : null);
  }

  return (
    <div
      className="grid aspect-square w-[min(76vh,94vw)] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg shadow-2xl ring-4 ring-[var(--sq-frame)]"
      role="grid"
      aria-label="mess board"
    >
      {game.board.map((_, i) => {
        const sq = flipped ? game.board.length - 1 - i : i;
        const piece = game.board[sq];
        const row = Math.floor(sq / BOARD_SIZE);
        const col = sq % BOARD_SIZE;
        // Coordinates go on the left column and bottom row as the player sees them.
        const leftEdge = i % BOARD_SIZE === 0;
        const bottomEdge = i >= BOARD_SIZE * (BOARD_SIZE - 1);
        const dark = (row + col) % 2 === 1;
        const isTarget = showHints && targets.includes(sq);
        const highlight =
          sq === checkedKing
            ? "var(--check)"
            : sq === selected
              ? "var(--select)"
              : last && (sq === last.from || sq === last.to)
                ? "var(--last)"
                : undefined;
        return (
          <button
            key={sq}
            onClick={() => click(sq)}
            className="relative flex min-h-0 min-w-0 items-center justify-center"
            style={{ background: dark ? "var(--sq-dark)" : "var(--sq-light)", cursor: interactive ? "pointer" : "default" }}
            aria-label={`${FILES[col]}${BOARD_SIZE - row}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${pieceDef(piece.n).label}` : ""}`}
          >
            {highlight && <span className="absolute inset-0" style={{ background: highlight }} />}
            {leftEdge && (
              <span className="absolute top-0.5 left-1 text-[clamp(8px,1.3vh,12px)] font-medium opacity-60" style={{ color: dark ? "var(--sq-light)" : "var(--sq-dark)" }}>
                {BOARD_SIZE - row}
              </span>
            )}
            {bottomEdge && (
              <span className="absolute right-1 bottom-0.5 text-[clamp(8px,1.3vh,12px)] font-medium opacity-60" style={{ color: dark ? "var(--sq-light)" : "var(--sq-dark)" }}>
                {FILES[col]}
              </span>
            )}
            {piece && (
              <span
                className="relative flex aspect-square w-[78%] items-center justify-center rounded-full font-math text-[min(3.4vh,4.2vw)] font-semibold shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition-transform"
                style={{
                  background: piece.color === "w" ? "var(--piece-w-bg)" : "var(--piece-b-bg)",
                  color: piece.color === "w" ? "var(--piece-w-fg)" : "var(--piece-b-fg)",
                  // Outlined pieces in the Chalkboard and Blueprint looks; transparent in Classic.
                  border: `2px solid ${piece.color === "w" ? "var(--piece-w-ring)" : "var(--piece-b-ring)"}`,
                  textShadow: "var(--piece-glow)",
                  boxShadow: piece.n === 1 ? "0 0 0 2px var(--accent), 0 3px 6px rgba(0,0,0,.35)" : undefined,
                  transform: sq === selected ? "scale(1.08)" : undefined,
                }}
              >
                <PieceLabel n={piece.n} />
              </span>
            )}
            {isTarget &&
              (piece ? (
                <span className="absolute inset-[4%] rounded-full border-[0.45vh] border-[var(--hint)]" />
              ) : (
                <span className="absolute h-[26%] w-[26%] rounded-full bg-[var(--hint)]" />
              ))}
          </button>
        );
      })}
    </div>
  );
}
