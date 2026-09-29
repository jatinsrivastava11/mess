// Shared plumbing for the game API routes.
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "../firebase/admin";
import { type GameDoc, type Outcome, winnerToCredit } from "./game-doc";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Verifies the Firebase ID token in `Authorization: Bearer …` and returns who it belongs to. */
export async function requireUser(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in first.");
  try {
    return { uid: (await adminAuth().verifyIdToken(token)).uid };
  } catch {
    throw new HttpError(401, "Your session expired. Refresh the page.");
  }
}

export const requireUid = async (req: Request) => (await requireUser(req)).uid;

/** True once this user has an email + password attached (not just a guest). Checked on the account record, not the token. */
export async function hasEmailAccount(uid: string): Promise<boolean> {
  const user = await adminAuth().getUser(uid);
  return user.providerData.some((p) => p.providerId === "password");
}

export const userRef = (uid: string) => adminDb().collection("users").doc(uid);
export const usernameRef = (key: string) => adminDb().collection("usernames").doc(key);

/** The player's username, or null for guests and accounts without one yet. */
export async function usernameOf(uid: string): Promise<string | null> {
  const snap = await userRef(uid).get();
  return (snap.get("username") as string | undefined) ?? null;
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {}
  throw new HttpError(400, "Bad request.");
}

export const gameRef = (code: string) => adminDb().collection("games").doc(code);

/**
 * Loads a game, applies `change` inside a transaction (so two moves can't race),
 * and saves the result. If the change ends the game, the winner's win is added
 * in the same transaction, so it's counted exactly once and only by the server.
 */
export async function updateGame(code: string, change: (doc: GameDoc, now: number) => Outcome): Promise<Outcome> {
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(gameRef(code));
    if (!snap.exists) throw new HttpError(404, "No game with that code.");
    const before = snap.data() as GameDoc;
    const out = change(before, Date.now());

    // Wins count only for accounts with a username and a verified email.
    const winner = out.doc ? winnerToCredit(before, out.doc) : null;
    let credit = false;
    if (winner) {
      const [profile, account] = await Promise.all([
        tx.get(userRef(winner)), // transaction reads must come before any writes
        adminAuth().getUser(winner).catch(() => null),
      ]);
      credit = profile.exists && Boolean(account?.emailVerified);
    }

    if (out.doc) tx.set(gameRef(code), out.doc);
    if (winner && credit) tx.update(userRef(winner), { wins: FieldValue.increment(1) });
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
