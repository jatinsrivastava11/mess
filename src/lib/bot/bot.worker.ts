// Runs in a background thread so the page stays smooth while the bot thinks.
import type { GameState } from "../game/engine";
import { type Level, chooseMove } from "./search";

self.onmessage = (e: MessageEvent<{ id: number; game: GameState; level: Level; searchMs?: number }>) => {
  const { id, game, level, searchMs } = e.data;
  self.postMessage({ id, move: chooseMove(game, level, Math.random, undefined, searchMs) });
};
