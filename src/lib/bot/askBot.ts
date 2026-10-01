"use client";

import type { GameState } from "../game/engine";
import type { Level } from "./search";

type Move = { from: number; to: number } | null;

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, (m: Move) => void>();

function getWorker(): Worker | null {
  if (worker || typeof Worker === "undefined") return worker;
  worker = new Worker(new URL("./bot.worker.ts", import.meta.url));
  worker.onmessage = (e: MessageEvent<{ id: number; move: Move }>) => {
    waiting.get(e.data.id)?.(e.data.move);
    waiting.delete(e.data.id);
  };
  return worker;
}

/**
 * Asks the bot for its move. Resolves after at least `minMs`, so instant replies don't feel robotic.
 * `searchMs` limits how long Hard searches (it shrinks when the bot's clock is low).
 */
export async function askBot(game: GameState, level: Level, minMs = 450, searchMs?: number): Promise<Move> {
  const started = Date.now();
  const w = getWorker();
  let move: Move;
  if (w) {
    const id = nextId++;
    move = await new Promise<Move>((resolve) => {
      waiting.set(id, resolve);
      w.postMessage({ id, game, level, searchMs });
    });
  } else {
    const { chooseMove } = await import("./search"); // no worker support: think on the main thread
    move = chooseMove(game, level, Math.random, undefined, searchMs);
  }
  const left = minMs - (Date.now() - started);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
  return move;
}
