// Runs in a background thread so the page stays smooth while the bot thinks.
import type { GameState } from "../game/engine";
import { type Level, chooseMove } from "./search";

self.onmessage = (e: MessageEvent<{ id: number; game: GameState; level: Level }>) => {
  const { id, game, level } = e.data;
  self.postMessage({ id, move: chooseMove(game, level) });
};
