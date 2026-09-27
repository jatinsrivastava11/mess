"use client";

import { useEffect, useState } from "react";
import { type Color, type GameState, makeMove, newGame, resign } from "@/lib/game/engine";
import { randomSeed } from "@/lib/game/rng";
import { Board } from "./Board";
import { Logo } from "./Logo";
import { Button, Modal } from "./Modal";
import { Rules } from "./Rules";

// For now a game code is just the board's seed in base 36, and games are played
// on one device. When online play lands, codes will point at a game stored in Supabase.
const toCode = (seed: number) => seed.toString(36).toUpperCase().padStart(7, "0");
function fromCode(code: string): number | null {
  const clean = code.trim().toUpperCase();
  if (!/^[0-9A-Z]{1,7}$/.test(clean)) return null;
  const seed = parseInt(clean, 36);
  return seed < 2 ** 32 ? seed : null;
}

type Popup = null | "info" | "menu" | "profile" | "account" | "settings";
type Home = "choose" | "create" | "join";

const colorName = (c: Color) => (c === "w" ? "White" : "Black");

export function MessApp() {
  const [game, setGame] = useState<GameState>(() => newGame(2026));
  const [playing, setPlaying] = useState(false);
  const [home, setHome] = useState<Home>("choose");
  const [popup, setPopup] = useState<Popup>(null);
  const [pendingSeed, setPendingSeed] = useState(0);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const over = game.status.kind !== "playing";

  useEffect(() => {
    if (!playing || over) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(id);
  }, [playing, over, startedAt]);

  function start(seed: number) {
    setGame(newGame(seed));
    setPlaying(true);
    setStartedAt(Date.now());
    setElapsed(0);
    setPopup(null);
  }

  function goHome() {
    setPlaying(false);
    setHome("choose");
    setPopup(null);
    setJoinCode("");
    setJoinError("");
  }

  function createGame() {
    setPendingSeed(randomSeed());
    setCopied(false);
    setHome("create");
  }

  function join() {
    const seed = fromCode(joinCode);
    if (seed === null) return setJoinError("That doesn't look like a game code.");
    start(seed);
  }

  function doResign() {
    setGame((g) => resign(g, g.turn));
    goHome();
  }

  return (
    <main className="relative flex h-dvh w-full items-center justify-center">
      {/* Top centre: spotlighted title */}
      <header className="spotlight pointer-events-none absolute inset-x-0 top-0 flex h-28 justify-center pt-3">
        <div className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="font-math text-3xl font-bold tracking-tight">mess</h1>
        </div>
      </header>

      {/* Top left: match timer while playing, otherwise profile / account / settings */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {playing ? (
          <div className="rounded-xl border border-panel-border bg-panel px-3 py-2 font-mono text-sm tabular-nums shadow-sm">
            <span className="mr-2">{formatTime(elapsed)}</span>
            <span className="text-muted">{over ? "game over" : `${colorName(game.turn)} to move`}</span>
          </div>
        ) : (
          <>
            <IconButton label="Profile" onClick={() => setPopup("profile")}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </IconButton>
            <IconButton label="Account" onClick={() => setPopup("account")}>
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </IconButton>
            <IconButton label="Settings" onClick={() => setPopup("settings")}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
            </IconButton>
          </>
        )}
      </div>

      {/* Top right: menu and rules */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <IconButton label="Rules" onClick={() => setPopup("info")}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.5v.5" />
        </IconButton>
        <IconButton label="Menu" onClick={() => setPopup("menu")}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </IconButton>
      </div>

      {/* Centre: the board */}
      <div className="mt-10">
        <Board game={game} onMove={(f, t) => setGame((g) => makeMove(g, f, t))} interactive={playing && !over} />
      </div>

      {/* Bottom left: subtle site name */}
      <span className="absolute bottom-3 left-4 font-math text-sm text-muted opacity-60">mess</span>

      {/* Bottom right: theme toggle */}
      <div className="absolute right-4 bottom-4">
        <ThemeToggle />
      </div>

      {!playing && popup === null && (
        <Modal>
          {home === "choose" && (
            <div className="space-y-3 text-center">
              <div className="mb-5 flex flex-col items-center gap-2">
                <Logo className="h-12 w-12" />
                <p className="text-sm text-muted">Chess where every piece is a square root.</p>
              </div>
              <Button onClick={createGame}>Create Game</Button>
              <Button variant="ghost" onClick={() => setHome("join")}>
                Join Game
              </Button>
            </div>
          )}
          {home === "create" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Your game code</h2>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(toCode(pendingSeed)).then(() => setCopied(true), () => {});
                }}
                className="w-full rounded-xl border border-dashed border-panel-border py-4 font-mono text-3xl tracking-[0.25em] hover:bg-fg/5"
                title="Copy code"
              >
                {toCode(pendingSeed)}
              </button>
              <p className="text-center text-xs text-muted">{copied ? "Copied!" : "Click the code to copy it."}</p>
              <p className="text-xs text-muted">
                Online play is coming soon. For now, the same code always makes the same board, so you can play it here
                on one device.
              </p>
              <Button onClick={() => start(pendingSeed)}>Start on this device</Button>
              <Button variant="ghost" onClick={() => setHome("choose")}>
                Back
              </Button>
            </div>
          )}
          {home === "join" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                join();
              }}
            >
              <h2 className="text-xl font-semibold">Join a game</h2>
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setJoinError("");
                }}
                placeholder="ENTER CODE"
                maxLength={7}
                className="w-full rounded-xl border border-panel-border bg-transparent px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] outline-none focus:border-accent"
              />
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              <Button type="submit" disabled={!joinCode}>
                Join
              </Button>
              <Button variant="ghost" onClick={() => setHome("choose")}>
                Back
              </Button>
            </form>
          )}
        </Modal>
      )}

      {popup === "info" && (
        <Modal title="How to play mess" onClose={() => setPopup(null)} wide>
          <Rules />
        </Modal>
      )}

      {popup === "menu" && (
        <Modal title="Menu" onClose={() => setPopup(null)}>
          <div className="space-y-3">
            {playing && !over ? (
              <>
                <p className="text-sm text-muted">Resigning ends the game as a loss for {colorName(game.turn)}.</p>
                <Button variant="danger" onClick={doResign}>
                  Resign
                </Button>
              </>
            ) : playing ? (
              <Button onClick={goHome}>Back to home</Button>
            ) : (
              <p className="text-sm text-muted">Start or join a game to see match options here.</p>
            )}
          </div>
        </Modal>
      )}

      {(popup === "profile" || popup === "account" || popup === "settings") && (
        <Modal title={popup[0].toUpperCase() + popup.slice(1)} onClose={() => setPopup(null)}>
          <p className="text-sm text-muted">
            {popup === "settings"
              ? "Settings are coming later."
              : "Accounts are on the way: sign in with email to track your wins and achievements."}
          </p>
        </Modal>
      )}

      {playing && over && popup === null && (
        <Modal title={resultTitle(game)}>
          <p className="mb-4 text-sm text-muted">
            {resultDetail(game)} in {formatTime(elapsed)} after {game.history.length} moves.
          </p>
          <div className="space-y-2">
            <Button onClick={goHome}>Back to home</Button>
            <Button variant="ghost" onClick={() => setPopup("menu")}>
              View board
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function resultTitle(g: GameState) {
  const s = g.status;
  if (s.kind === "checkmate" || s.kind === "resigned") return `${colorName(s.winner)} wins`;
  return "Draw";
}

function resultDetail(g: GameState) {
  const s = g.status;
  switch (s.kind) {
    case "checkmate":
      return "Checkmate";
    case "resigned":
      return "Resignation";
    case "stalemate":
      return "Stalemate";
    case "draw":
      return s.reason === "only-kings" ? "Only the kings are left" : "50 moves each without a capture";
    default:
      return "";
  }
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-panel-border bg-panel shadow-sm transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        {children}
      </svg>
    </button>
  );
}

// Pure CSS: the `dark` class on <html> drives the knob position and icon, so there is no state to sync.
function ThemeToggle() {
  function toggle() {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("mess-theme", dark ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="relative flex h-8 w-14 items-center rounded-full border border-panel-border bg-panel px-1 shadow-sm"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fg text-bg transition-transform dark:translate-x-[22px]">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
          <circle cx="12" cy="12" r="5" className="dark:hidden" />
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" className="hidden dark:block" />
        </svg>
      </span>
    </button>
  );
}
