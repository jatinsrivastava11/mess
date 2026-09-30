"use client";

import { type CSSProperties, type PointerEvent, useRef, useState } from "react";
import { type GameState, type Piece, inCheck, kingSquare, legalTargets } from "@/lib/game/engine";
import { BOARD_SIZE, pieceDef } from "@/lib/game/pieces";
import { PieceLabel } from "./PieceLabel";

const FILES = "abcdefgh";
/** How far (px) the pointer must travel before a press becomes a drag instead of a tap. */
const DRAG_START = 6;

function discStyle(piece: Piece): CSSProperties {
  return {
    background: piece.color === "w" ? "var(--piece-w-bg)" : "var(--piece-b-bg)",
    color: piece.color === "w" ? "var(--piece-w-fg)" : "var(--piece-b-fg)",
    // Outlined pieces in the Chalkboard, Blueprint and Neon looks; transparent in Classic.
    border: `2px solid ${piece.color === "w" ? "var(--piece-w-ring)" : "var(--piece-b-ring)"}`,
    textShadow: "var(--piece-glow)",
    boxShadow: `${piece.n === 1 ? "0 0 0 2px var(--accent), " : ""}var(--piece-${piece.color}-shadow)`,
  };
}

interface Drag {
  from: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
  /** Board position on screen, measured when the drag starts. */
  rect: DOMRect | null;
  /** Square under the pointer. */
  over: number | null;
}

export function Board({
  game,
  onMove,
  interactive,
  flipped = false,
  showHints = false,
  onIllegal,
  className = "w-[min(76vh,94vw)]",
}: {
  game: GameState;
  onMove: (from: number, to: number) => void;
  interactive: boolean;
  /** Show the board from Black's side. */
  flipped?: boolean;
  /** Dots on the squares the selected piece can reach (first game and tutorials only). */
  showHints?: boolean;
  /** Called when the player tries a square the piece can't reach (by tap or by drag). */
  onIllegal?: (from: number, to: number) => void;
  /** Sizing classes for the board. */
  className?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // A drag ends with a click event on the start square; this swallows it.
  const swallowClick = useRef(false);

  const targets = selected === null || !interactive ? [] : legalTargets(game, selected);
  const last = game.history.at(-1);
  const checkedKing = inCheck(game.board, game.turn) ? kingSquare(game.board, game.turn) : -1;
  const isOwn = (sq: number) => game.board[sq]?.color === game.turn;

  function attempt(from: number, to: number) {
    if (legalTargets(game, from).includes(to)) onMove(from, to);
    else onIllegal?.(from, to);
    setSelected(null);
  }

  function click(sq: number) {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    if (!interactive) return;
    if (selected !== null && sq !== selected && !isOwn(sq)) return attempt(selected, sq);
    setSelected(isOwn(sq) && sq !== selected ? sq : null);
  }

  /** Board square under a screen point, or null if outside the board. */
  function squareAt(x: number, y: number, rect: DOMRect | null): number | null {
    if (!rect) return null;
    const col = Math.floor(((x - rect.left) / rect.width) * BOARD_SIZE);
    const row = Math.floor(((y - rect.top) / rect.height) * BOARD_SIZE);
    if (col < 0 || row < 0 || col >= BOARD_SIZE || row >= BOARD_SIZE) return null;
    const i = row * BOARD_SIZE + col;
    return flipped ? BOARD_SIZE * BOARD_SIZE - 1 - i : i;
  }

  function pointerDown(e: PointerEvent, sq: number) {
    if (!interactive || !isOwn(sq) || e.button !== 0) return;
    setDrag({ from: sq, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false, rect: null, over: sq });
  }

  function pointerMove(e: PointerEvent) {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_START;
    let rect = drag.rect;
    if (moved && !drag.active) {
      gridRef.current?.setPointerCapture(e.pointerId);
      rect = gridRef.current?.getBoundingClientRect() ?? null;
      setSelected(drag.from);
    }
    setDrag({
      ...drag,
      x: e.clientX,
      y: e.clientY,
      active: drag.active || moved,
      rect,
      over: squareAt(e.clientX, e.clientY, rect),
    });
  }

  function pointerUp(e: PointerEvent) {
    if (!drag) return;
    if (drag.active) {
      swallowClick.current = true;
      const to = squareAt(e.clientX, e.clientY, drag.rect);
      if (to !== null && to !== drag.from) attempt(drag.from, to);
      else setSelected(null); // dropped back on its square or off the board: nothing happens
    }
    setDrag(null);
  }

  const dragging = drag?.active ? drag : null;
  const gridRect = dragging?.rect;
  const draggedPiece = dragging ? game.board[dragging.from] : null;

  return (
    <div
      ref={gridRef}
      className={`relative grid aspect-square grid-cols-8 grid-rows-8 overflow-hidden rounded-lg ${className}`}
      style={{ boxShadow: "var(--board-shadow)", touchAction: interactive ? "none" : undefined }}
      role="grid"
      aria-label="mess board"
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => setDrag(null)}
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
        const hovered = dragging?.over === sq && sq !== dragging.from;
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
            onPointerDown={(e) => pointerDown(e, sq)}
            className="relative flex min-h-0 min-w-0 items-center justify-center"
            style={{
              background: dark ? "var(--sq-dark)" : "var(--sq-light)",
              boxShadow: "inset 0 0 0 0.5px var(--sq-line), inset 0 0 10px var(--sq-glow)",
              cursor: interactive ? (isOwn(sq) ? (dragging ? "grabbing" : "grab") : "pointer") : "default",
            }}
            aria-label={`${FILES[col]}${BOARD_SIZE - row}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${pieceDef(piece.n).label}` : ""}`}
          >
            {highlight && <span className="absolute inset-0" style={{ background: highlight }} />}
            {/* The square under a dragged piece is outlined, but never marked right or wrong. */}
            {hovered && <span className="absolute inset-0 ring-2 ring-inset ring-[var(--accent)]" />}
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
                className="relative flex aspect-square w-[78%] items-center justify-center rounded-full font-math text-[min(3.4vh,4.2vw)] font-semibold transition-transform"
                style={{
                  ...discStyle(piece),
                  transform: sq === selected && !dragging ? "scale(1.08)" : undefined,
                  opacity: dragging?.from === sq ? 0.3 : 1,
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

      {/* The piece follows the pointer while dragging. */}
      {dragging && draggedPiece && gridRect && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 flex items-center justify-center rounded-full font-math text-[min(3.8vh,4.6vw)] font-semibold"
          style={{
            ...discStyle(draggedPiece),
            width: (gridRect.width / BOARD_SIZE) * 0.9,
            height: (gridRect.width / BOARD_SIZE) * 0.9,
            left: dragging.x - gridRect.left,
            top: dragging.y - gridRect.top,
            transform: "translate(-50%, -50%) scale(1.05)",
          }}
        >
          <PieceLabel n={draggedPiece.n} />
        </span>
      )}
    </div>
  );
}
