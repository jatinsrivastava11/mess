// An online game as stored in Firestore (games/{code}), and the server-side
// rules for changing it. Everything here is pure: the API routes load a doc,
// call one of these functions, and save the result. Clients never write games
// directly, so every move is re-checked here with the same engine the UI uses.

import { type Clock, TIME_CONTROLS_MIN, type TimeControl, flagged, pressClock, startClock, stopClock } from "../game/clock";
import { type Color, type GameState, type Status, legalTargets, makeMove, newGame } from "../game/engine";

export interface GameDoc {
  code: string;
  seed: number;
  minutes: TimeControl;
  players: Record<Color, string | null>;
  moves: { from: number; to: number }[];
  status: Status;
  /** null until both players have joined. */
  clock: Clock | null;
  createdAt: number;
  updatedAt: number;
}

/** A change to save (`doc`), an error to report, or both (e.g. a move that arrived after the flag fell). */
export interface Outcome {
  doc?: GameDoc;
  error?: string;
  httpStatus?: number;
}

// No 0/O, 1/I/L, so codes are easy to read out loud.
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function randomCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return code;
}

export const isTimeControl = (m: unknown): m is TimeControl => TIME_CONTROLS_MIN.includes(m as TimeControl);

/** Rebuilds the full game state by replaying the moves from the seed. */
export function replay(doc: GameDoc): GameState {
  let game = newGame(doc.seed);
  for (const m of doc.moves) game = makeMove(game, m.from, m.to);
  // Resignations and timeouts aren't moves, so take the stored status.
  return { ...game, status: doc.status };
}

export function colorOf(doc: GameDoc, uid: string): Color | null {
  return doc.players.w === uid ? "w" : doc.players.b === uid ? "b" : null;
}

export function createDoc(opts: {
  code: string;
  uid: string;
  minutes: TimeControl;
  seed: number;
  creatorColor: Color;
  now: number;
}): GameDoc {
  const { code, uid, minutes, seed, creatorColor, now } = opts;
  return {
    code,
    seed,
    minutes,
    players: { w: creatorColor === "w" ? uid : null, b: creatorColor === "b" ? uid : null },
    moves: [],
    status: { kind: "playing" },
    clock: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function joinDoc(doc: GameDoc, uid: string, now: number): Outcome {
  if (colorOf(doc, uid)) return {}; // already in: rejoining is fine
  if (doc.players.w && doc.players.b) return { error: "This game is already full.", httpStatus: 409 };
  if (doc.status.kind !== "playing") return { error: "This game has ended.", httpStatus: 409 };
  const players = { ...doc.players, [doc.players.w ? "b" : "w"]: uid };
  return { doc: { ...doc, players, clock: startClock(doc.minutes, now), updatedAt: now } };
}

/** Ends the game if the player to move has run out of time. */
function checkFlag(doc: GameDoc, now: number): GameDoc | null {
  if (!doc.clock || doc.status.kind !== "playing") return null;
  const loser = flagged(doc.clock, now);
  if (!loser) return null;
  return {
    ...doc,
    status: { kind: "timeout", winner: loser === "w" ? "b" : "w" },
    clock: stopClock(doc.clock, now),
    updatedAt: now,
  };
}

export function moveDoc(doc: GameDoc, uid: string, from: number, to: number, ply: number, now: number): Outcome {
  const color = colorOf(doc, uid);
  if (!color) return { error: "You're not a player in this game.", httpStatus: 403 };
  if (!doc.clock) return { error: "Waiting for your opponent to join.", httpStatus: 409 };
  if (doc.status.kind !== "playing") return { error: "This game has ended.", httpStatus: 409 };
  // `ply` is how many moves the client had seen. It stops a double-click or a
  // stale tab from playing a move against a position that no longer exists.
  if (ply !== doc.moves.length) return { error: "The board changed. Try again.", httpStatus: 409 };

  const timedOut = checkFlag(doc, now);
  if (timedOut) return { doc: timedOut, error: "Your time ran out.", httpStatus: 409 };

  const game = replay(doc);
  if (game.turn !== color) return { error: "It's not your turn.", httpStatus: 409 };
  if (!legalTargets(game, from).includes(to)) return { error: "Illegal move.", httpStatus: 400 };

  const next = makeMove(game, from, to);
  const clock = next.status.kind === "playing" ? pressClock(doc.clock, now) : stopClock(doc.clock, now);
  return { doc: { ...doc, moves: [...doc.moves, { from, to }], status: next.status, clock, updatedAt: now } };
}

export function resignDoc(doc: GameDoc, uid: string, now: number): Outcome {
  const color = colorOf(doc, uid);
  if (!color) return { error: "You're not a player in this game.", httpStatus: 403 };
  if (doc.status.kind !== "playing") return {};
  return {
    doc: {
      ...doc,
      status: { kind: "resigned", winner: color === "w" ? "b" : "w" },
      clock: doc.clock && stopClock(doc.clock, now),
      updatedAt: now,
    },
  };
}

/** Either player can ask the server to check the clock; it only ends the game if time really ran out. */
export function flagDoc(doc: GameDoc, uid: string, now: number): Outcome {
  if (!colorOf(doc, uid)) return { error: "You're not a player in this game.", httpStatus: 403 };
  const timedOut = checkFlag(doc, now);
  return timedOut ? { doc: timedOut } : {};
}
