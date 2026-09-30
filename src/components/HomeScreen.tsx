"use client";

import { type ReactNode, useEffect, useState } from "react";
import type { Account } from "@/lib/account/useAccount";
import { askBot } from "@/lib/bot/askBot";
import { makeMove, newGame } from "@/lib/game/engine";
import { randomSeed } from "@/lib/game/rng";
import { Board } from "./Board";
import { PieceLabel } from "./PieceLabel";

/** Two Medium bots playing each other, so visitors see a real game straight away. */
function DemoBoard() {
  const [game, setGame] = useState(() => newGame(7));

  useEffect(() => {
    let cancelled = false;
    if (game.status.kind !== "playing") {
      const id = setTimeout(() => setGame(newGame(randomSeed())), 3000);
      return () => clearTimeout(id);
    }
    askBot(game, "medium", 1400).then((m) => {
      if (!cancelled && m) setGame((g) => (g === game ? makeMove(g, m.from, m.to) : g));
    });
    return () => {
      cancelled = true;
    };
  }, [game]);

  return (
    <figure className="flex flex-col items-center gap-2">
      <Board game={game} onMove={() => {}} interactive={false} className="w-[min(88vw,60vh)] lg:w-[min(46vw,70vh)]" />
      <figcaption className="flex items-center gap-2 text-xs text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Live: two bots playing · move {game.history.length}
      </figcaption>
    </figure>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-panel-border bg-panel p-5 shadow-lg backdrop-blur">{children}</div>;
}

/**
 * The home screen. What's on it, and why:
 *  - a live board: shows what mess is faster than any explanation;
 *  - the play panel: the one thing most visitors came to do;
 *  - "you": wins if signed in, otherwise the reason to make an account;
 *  - how pieces move: the idea in one line each, with the full rules one tap away.
 */
export function HomeScreen({
  panel,
  account,
  onRules,
  onProfile,
  onAccount,
}: {
  panel: ReactNode;
  account: Account;
  onRules: () => void;
  onProfile: () => void;
  onAccount: () => void;
}) {
  return (
    <section className="absolute inset-0 overflow-y-auto px-4 pt-20 pb-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 lg:min-h-full lg:flex-row lg:justify-center lg:gap-14">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="font-display text-3xl leading-tight font-bold sm:text-4xl" style={{ textShadow: "var(--title-glow)" }}>
              Chess, but every piece is a square root.
            </h2>
            <p className="text-muted">
              √n jumps along a right triangle whose hypotenuse is √n. Work out the maths, then outplay your opponent.
            </p>
          </div>

          <Card>{panel}</Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <p className="mb-1 text-xs font-semibold tracking-wide text-accent uppercase">You</p>
              {account.profile ? (
                <button onClick={onProfile} className="w-full text-left">
                  <p className="truncate font-semibold">{account.profile.username}</p>
                  <p className="text-sm text-muted">
                    {account.profile.wins} {account.profile.wins === 1 ? "win" : "wins"}
                    {!account.verified && " · verify your email to count wins"}
                  </p>
                </button>
              ) : (
                <button onClick={onAccount} className="w-full text-left">
                  <p className="font-semibold">Playing as a guest</p>
                  <p className="text-sm text-muted">Create a free account to save your wins.</p>
                </button>
              )}
            </Card>
            <Card>
              <p className="mb-2 text-xs font-semibold tracking-wide text-accent uppercase">How pieces move</p>
              <ul className="space-y-1.5 text-sm">
                <li className="flex items-center gap-2">
                  <span className="font-math font-semibold">
                    <PieceLabel n={5} />
                  </span>
                  <span className="text-muted">1² + 2²: jumps 1 and 2, like a knight</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-math font-semibold">
                    <PieceLabel n={8} />
                  </span>
                  <span className="text-muted">2² + 2²: equal sides, 2 straight</span>
                </li>
              </ul>
              <button onClick={onRules} className="mt-2 text-sm font-medium text-accent hover:underline">
                All rules →
              </button>
            </Card>
          </div>
        </div>

        <DemoBoard />
      </div>
    </section>
  );
}
