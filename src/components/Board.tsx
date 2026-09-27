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
}: {
  game: GameState;
  onMove: (from: number, to: number) => void;
  interactive: boolean;
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
    setSelected(piece && piece.color === game.turn && sq !== selected ? sq : null);
  }

  return (
    <div
      className="grid aspect-square w-[min(76vh,94vw)] grid-cols-8 grid-rows-8 overflow-hidden rounded-lg shadow-2xl ring-4 ring-[var(--sq-frame)]"
      role="grid"
      aria-label="mess board"
    >
      {game.board.map((piece, sq) => {
        const row = Math.floor(sq / BOARD_SIZE);
        const col = sq % BOARD_SIZE;
        const dark = (row + col) % 2 === 1;
        const isTarget = targets.includes(sq);
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
            {col === 0 && (
              <span className="absolute top-0.5 left-1 text-[clamp(8px,1.3vh,12px)] font-medium opacity-60" style={{ color: dark ? "var(--sq-light)" : "var(--sq-dark)" }}>
                {BOARD_SIZE - row}
              </span>
            )}
            {row === BOARD_SIZE - 1 && (
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
