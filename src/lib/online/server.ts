// Shared plumbing for the game API routes.
import "server-only";
import { adminAuth, adminDb } from "../firebase/admin";
import type { GameDoc, Outcome } from "./game-doc";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Verifies the Firebase ID token in `Authorization: Bearer …` and returns the user's id. */
export async function requireUid(req: Request): Promise<string> {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in first.");
  try {
    return (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    throw new HttpError(401, "Your session expired. Refresh the page.");
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  throw new HttpError(400, "Bad request.");
}

export const gameRef = (code: string) => adminDb().collection("games").doc(code);

/** Loads a game, applies `change` inside a transaction (so two moves can't race), and saves the result. */
export async function updateGame(code: string, change: (doc: GameDoc, now: number) => Outcome): Promise<Outcome> {
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(gameRef(code));
    if (!snap.exists) throw new HttpError(404, "No game with that code.");
    const out = change(snap.data() as GameDoc, Date.now());
    if (out.doc) tx.set(gameRef(code), out.doc);
    return out;
  });
}

/** Every response carries the server clock so browsers can line their clocks up with it. */
export function reply(body: Record<string, unknown>, status = 200) {
  return Response.json({ ...body, serverNow: Date.now() }, { status });
}

export function replyError(err: unknown) {
  if (err instanceof HttpError) return reply({ error: err.message }, err.status);
  console.error(err);
  return reply({ error: "Something went wrong. Try again." }, 500);
}
