import { describe, expect, it } from "vitest";
import { legalTargets } from "../game/engine";
import {
  CODE_PATTERN,
  type GameDoc,
  createDoc,
  flagDoc,
  joinDoc,
  moveDoc,
  randomCode,
  replay,
  resignDoc,
  winnerToCredit,
} from "./game-doc";

const T0 = 1_000_000;

function started(): GameDoc {
  const doc = createDoc({ code: "ABCDEF", uid: "alice", minutes: 3, seed: 7, creatorColor: "w", now: T0 });
  return joinDoc(doc, "bob", T0).doc!;
}

/** First legal move for whoever is to move. */
function anyMove(doc: GameDoc) {
  const game = replay(doc);
  for (let from = 0; from < 64; from++) {
    const t = legalTargets(game, from);
    if (t.length) return { from, to: t[0] };
  }
  throw new Error("no moves");
}

describe("online game rules", () => {
  it("makes readable codes", () => {
    for (let i = 0; i < 100; i++) expect(randomCode()).toMatch(CODE_PATTERN);
  });

  it("seats the joiner in the free colour and starts the clock", () => {
    const doc = started();
    expect(doc.players).toEqual({ w: "alice", b: "bob" });
    expect(doc.clock?.running).toBe("w");
    expect(joinDoc(doc, "carol", T0).error).toMatch(/full/);
    expect(joinDoc(doc, "alice", T0)).toEqual({}); // rejoin is a no-op
  });

  it("won't start moving before the opponent joins", () => {
    const doc = createDoc({ code: "ABCDEF", uid: "alice", minutes: 3, seed: 7, creatorColor: "w", now: T0 });
    const m = anyMove(started());
    expect(moveDoc(doc, "alice", m.from, m.to, 0, T0).error).toMatch(/Waiting/);
  });

  it("accepts a legal move from the right player and presses the clock", () => {
    const doc = started();
    const m = anyMove(doc);
    const out = moveDoc(doc, "alice", m.from, m.to, 0, T0 + 5_000);
    expect(out.error).toBeUndefined();
    expect(out.doc!.moves).toEqual([m]);
    expect(out.doc!.clock!.running).toBe("b");
    expect(out.doc!.clock!.remaining.w).toBe(175_000);
  });

  it("rejects moves out of turn, from strangers, stale boards and illegal squares", () => {
    const doc = started();
    const m = anyMove(doc);
    expect(moveDoc(doc, "bob", m.from, m.to, 0, T0).error).toMatch(/not your turn/);
    expect(moveDoc(doc, "mallory", m.from, m.to, 0, T0).httpStatus).toBe(403);
    expect(moveDoc(doc, "alice", m.from, m.to, 1, T0).error).toMatch(/changed/);
    expect(moveDoc(doc, "alice", m.from, m.from, 0, T0).error).toMatch(/Illegal/);
  });

  it("ends the game on time instead of accepting a late move", () => {
    const doc = started();
    const m = anyMove(doc);
    const out = moveDoc(doc, "alice", m.from, m.to, 0, T0 + 180_000);
    expect(out.error).toMatch(/time ran out/);
    expect(out.doc!.status).toEqual({ kind: "timeout", winner: "b" });
  });

  it("lets either player claim a flag only when time is really up", () => {
    const doc = started();
    expect(flagDoc(doc, "bob", T0 + 179_000)).toEqual({});
    expect(flagDoc(doc, "bob", T0 + 180_000).doc!.status).toEqual({ kind: "timeout", winner: "b" });
  });

  it("resigning hands the win to the opponent", () => {
    const out = resignDoc(started(), "bob", T0);
    expect(out.doc!.status).toEqual({ kind: "resigned", winner: "w" });
    expect(out.doc!.clock!.running).toBeNull();
  });

  it("stores usernames for signed-in players", () => {
    const doc = createDoc({ code: "ABCDEF", uid: "alice", name: "alice_1", minutes: 3, seed: 7, creatorColor: "b", now: T0 });
    expect(joinDoc(doc, "bob", T0, null).doc!.names).toEqual({ w: null, b: "alice_1" });
  });

  it("credits a win only for a decisive result after enough moves", () => {
    let doc = started();
    // A resignation right away doesn't count.
    expect(winnerToCredit(doc, resignDoc(doc, "bob", T0).doc!)).toBeNull();
    for (let i = 0; i < 10; i++) {
      const m = anyMove(doc);
      const next = moveDoc(doc, doc.moves.length % 2 === 0 ? "alice" : "bob", m.from, m.to, doc.moves.length, T0 + i);
      expect(next.doc?.status.kind).toBe("playing");
      doc = next.doc!;
    }
    expect(doc.moves).toHaveLength(10);
    const resigned = resignDoc(doc, "bob", T0 + 20).doc!;
    expect(winnerToCredit(doc, resigned)).toBe("alice");
    // Already over: no second credit.
    expect(winnerToCredit(resigned, resigned)).toBeNull();
  });
});
