"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Clock, TIME_CONTROLS_MIN, type TimeControl, flagged, pressClock, startClock, stopClock } from "@/lib/game/clock";
import {
  type Color,
  type GameState,
  QUIET_MOVE_LIMIT,
  inCheck,
  makeMove,
  newGame,
  resign,
  rootSum,
  timeout,
} from "@/lib/game/engine";
import { explainIllegal } from "@/lib/game/explain";
import { randomSeed } from "@/lib/game/rng";
import { askBot } from "@/lib/bot/askBot";
import { LEVELS, type Level } from "@/lib/bot/search";
import { useAccount } from "@/lib/account/useAccount";
import { onlineAvailable } from "@/lib/firebase/client";
import { CODE_LENGTH, CODE_PATTERN, replay } from "@/lib/online/game-doc";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { AccountPanel, ProfilePanel } from "./AccountPanels";
import { HomeScreen } from "./HomeScreen";
import { Board } from "./Board";
import { ClockFace, IconButton, ResignFlag, ThemeToggle, colorName } from "./Controls";
import { LookPicker } from "./LookPicker";
import { Logo } from "./Logo";
import { Button, Modal } from "./Modal";
import { Rules } from "./Rules";

type Popup = null | "info" | "menu" | "profile" | "account" | "settings";
type Home = "choose" | "create" | "join" | "bot";

/** A game on this one device: pass-and-play, or against the bot. */
interface LocalGame {
  game: GameState;
  clock: Clock;
  bot?: { level: Level; color: Color; tutorial?: boolean };
}

const DEMO = newGame(2026); // the board behind the home popup

// Move dots are a training aid: only in your first game ever (on this device) and in tutorial games.
const FIRST_GAME_DONE = "mess-first-game-done";
function firstGameDone() {
  try {
    return localStorage.getItem(FIRST_GAME_DONE) === "1";
  } catch {
    return true; // storage blocked: don't nag every game
  }
}
function markFirstGameDone() {
  try {
    localStorage.setItem(FIRST_GAME_DONE, "1");
  } catch {}
}

export function MessApp() {
  const online = useOnlineGame();
  const account = useAccount();
  const [local, setLocal] = useState<LocalGame | null>(null);
  const [home, setHome] = useState<Home>("choose");
  const [popup, setPopup] = useState<Popup>(null);
  const [botLevel, setBotLevel] = useState<Level | "tutorial">("medium");
  const [humanSide, setHumanSide] = useState<Color | "random">("random");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [minutes, setMinutes] = useState<TimeControl>(10);
  const [now, setNow] = useState(0);
  // Online move shown straight away while the server confirms it.
  const [pending, setPending] = useState<{ from: number; to: number; ply: number } | null>(null);
  const flagSent = useRef(false);
  // Move review (← →): how many moves into the game we're looking at, or null for the live position.
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [hints, setHints] = useState(false);
  const [firstGameNotice, setFirstGameNotice] = useState(false);
  const [resultHidden, setResultHidden] = useState(false);
  const [notice, setNotice] = useState("");

  const doc = online.game;
  const isOnline = online.code !== null;
  const waiting = isOnline && !doc?.clock; // opponent hasn't joined yet
  const playing = isOnline || local !== null;

  const confirmed = useMemo(() => (doc ? replay(doc) : null), [doc]);
  const game: GameState =
    confirmed && pending?.ply === confirmed.history.length && confirmed.status.kind === "playing"
      ? makeMove(confirmed, pending.from, pending.to)
      : (confirmed ?? local?.game ?? DEMO);
  const clock = isOnline ? (doc?.clock ?? null) : (local?.clock ?? null);
  const over = game.status.kind !== "playing";
  const bot = local?.bot;
  const myColor: Color | null = isOnline ? online.color : bot ? (bot.color === "w" ? "b" : "w") : null;
  // Usernames on the clocks for online games; guests show as White/Black; bot games show You vs Bot.
  const nameOf = (c: Color) =>
    bot ? (c === bot.color ? `Bot · ${bot.tutorial ? "Tutorial" : LEVELS[bot.level].label}` : "You") : (doc?.names?.[c] ?? colorName(c));
  const opponent = myColor && doc?.names?.[myColor === "w" ? "b" : "w"];
  const pendingActive = pending !== null && pending.ply === confirmed?.history.length;

  // Latest flag() without making the clock effect restart on every render.
  const flagRef = useRef(online.flag);
  useEffect(() => {
    flagRef.current = online.flag;
  });
  const { serverNow } = online;

  // Tick the clocks, and end the game when one runs out. Re-runs only when the clock itself changes.
  useEffect(() => {
    if (!clock?.running) return;
    flagSent.current = false;
    const id = setInterval(() => {
      const t = isOnline ? serverNow() : Date.now();
      setNow(t);
      const loser = flagged(clock, t);
      if (!loser) return;
      if (isOnline) {
        // The server decides; ask once.
        if (!flagSent.current) {
          flagSent.current = true;
          flagRef.current().catch(() => {});
        }
      } else {
        setLocal((g) => g && { ...g, game: timeout(g.game, loser), clock: stopClock(g.clock, t) });
      }
    }, 100);
    return () => clearInterval(id);
  }, [clock, isOnline, serverNow]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  // Once a game has finished, the first-game hints are used up.
  useEffect(() => {
    if (playing && over) markFirstGameDone();
  }, [playing, over]);

  // ← → step through earlier positions without changing the game; Home/End jump to the start/live.
  const liveMoves = game.history.length;
  const liveMovesRef = useRef(liveMoves);
  useEffect(() => {
    liveMovesRef.current = liveMoves;
  });
  useEffect(() => {
    if (!playing) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [role=dialog]")) return;
      const total = liveMovesRef.current;
      if (e.key === "ArrowLeft") setViewPly((v) => Math.max(0, (v ?? total) - 1));
      else if (e.key === "ArrowRight") setViewPly((v) => (v === null || v + 1 >= total ? null : v + 1));
      else if (e.key === "Home") setViewPly(total > 0 ? 0 : null);
      else if (e.key === "End") setViewPly(null);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  /** Fresh game: reset review, decide on hints, and show the first-game notice if it applies. */
  function beginGame(tutorial = false) {
    const first = !firstGameDone();
    setHints(first || tutorial);
    setFirstGameNotice(first);
    setViewPly(null);
    setResultHidden(false);
  }

  function startLocal(withBot?: LocalGame["bot"], tutorial = false) {
    const t = Date.now();
    setLocal({ game: newGame(randomSeed()), clock: startClock(minutes, t), bot: withBot });
    setNow(t);
    setPopup(null);
    beginGame(tutorial);
  }

  function startBotGame() {
    const human: Color = humanSide === "random" ? (Math.random() < 0.5 ? "w" : "b") : humanSide;
    // Tutorial = the Easy bot with move dots on.
    const tutorial = botLevel === "tutorial";
    startLocal({ level: tutorial ? "easy" : botLevel, color: human === "w" ? "b" : "w", tutorial }, tutorial);
  }

  // The bot's turn: ask it (in a background thread) and play its answer, unless the game moved on meanwhile.
  const botToMove = Boolean(bot && local?.game.status.kind === "playing" && local.game.turn === bot.color);
  useEffect(() => {
    if (!botToMove || !local?.bot) return;
    const asked = local.game;
    let cancelled = false;
    askBot(asked, local.bot.level).then((m) => {
      if (cancelled || !m) return;
      const t = Date.now();
      setLocal((g) => {
        if (!g || g.game !== asked) return g;
        const next = makeMove(g.game, m.from, m.to);
        return { ...g, game: next, clock: next.status.kind === "playing" ? pressClock(g.clock, t) : stopClock(g.clock, t) };
      });
      setNow(t);
    });
    return () => {
      cancelled = true;
    };
  }, [botToMove, local?.game, local?.bot]);

  function move(from: number, to: number) {
    if (isOnline && confirmed) {
      setPending({ from, to, ply: confirmed.history.length });
      online.move(from, to).catch((e: Error) => {
        setPending(null);
        setError(e.message);
      });
      return;
    }
    const t = Date.now();
    setLocal((g) => {
      if (!g) return g;
      const next = makeMove(g.game, from, to);
      return { ...g, game: next, clock: next.status.kind === "playing" ? pressClock(g.clock, t) : stopClock(g.clock, t) };
    });
    setNow(t);
  }

  function goHome() {
    if (playing && game.history.length > 0) markFirstGameDone();
    online.leave();
    setLocal(null);
    setPending(null);
    setHome("choose");
    setPopup(null);
    setJoinCode("");
  }

  async function createOnline() {
    try {
      setCopied(false);
      await online.create(minutes);
      beginGame();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function joinOnline() {
    if (!CODE_PATTERN.test(joinCode)) return setError("Game codes are 6 letters and numbers.");
    try {
      await online.join(joinCode);
      beginGame();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doResign() {
    if (isOnline) {
      try {
        await online.resign();
      } catch (e) {
        return setError((e as Error).message);
      }
    } else {
      // Against the bot you always resign for yourself; pass-and-play resigns for whoever is to move.
      setLocal((g) => g && { ...g, game: resign(g.game, myColor ?? g.game.turn), clock: stopClock(g.clock, Date.now()) });
    }
    goHome();
  }

  const flipped = myColor === "b";
  const [topColor, bottomColor]: Color[] = flipped ? ["w", "b"] : ["b", "w"];
  // The home popup blurs the page, but its corner buttons (account, rules, theme…) must stay usable.
  const cornerLayer = "z-10";
  const interactive =
    playing && !over && !waiting && (isOnline ? game.turn === myColor && !pendingActive : !botToMove);

  // The position on screen: live, or an earlier one while reviewing.
  const reviewing = viewPly !== null && viewPly < liveMoves;
  const shown = useMemo(() => {
    if (!reviewing) return game;
    let g = newGame(game.seed);
    for (const m of game.history.slice(0, viewPly!)) g = makeMove(g, m.from, m.to);
    return g;
  }, [reviewing, viewPly, game]);
  const step = (d: -1 | 1) =>
    setViewPly((v) => {
      if (d < 0) return Math.max(0, (v ?? liveMoves) - 1);
      return v === null || v + 1 >= liveMoves ? null : v + 1;
    });

  // Resign flag sits next to your clock (pass-and-play: next to whoever is to move).
  const canResign = playing && !over && !waiting;
  const flagColor = myColor ?? game.turn;
  const clockWithFlag = (c: Color, clk: NonNullable<typeof clock>) => (
    <div className="flex items-center gap-1.5">
      <ClockFace color={c} clock={clk} now={now} label={nameOf(c)} />
      {canResign && c === flagColor && <ResignFlag onResign={doResign} />}
    </div>
  );

  return (
    <main className="relative flex h-dvh w-full items-center justify-center">
      {/* Top centre: spotlighted title */}
      <header className="spotlight pointer-events-none absolute inset-x-0 top-0 flex h-28 justify-center pt-3">
        <div className="flex h-9 items-center gap-2 sm:h-10">
          <Logo className="h-6 w-6 sm:h-8 sm:w-8" />
          {/* On narrow phones the home headline already says it, and the corner icons need the room. */}
          <h1
            className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${playing ? "" : "max-[420px]:hidden"}`}
            style={{ textShadow: "var(--title-glow)" }}
          >
            mess
          </h1>
        </div>
      </header>

      {/* Top left: chess clocks while playing (above/below the board on phones), otherwise profile / account / settings */}
      <div className={`absolute top-3 left-3 ${cornerLayer} flex items-center gap-1.5 sm:top-4 sm:left-4 sm:gap-2`}>
        {playing && clock ? (
          <div className="hidden flex-col gap-1.5 sm:flex">
            {clockWithFlag(topColor, clock)}
            {clockWithFlag(bottomColor, clock)}
          </div>
        ) : playing ? null : (
          <>
            <IconButton label={account.profile ? `Profile: ${account.profile.username}` : "Profile"} onClick={() => setPopup("profile")}>
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

      {/* Top right: rules and menu */}
      <div className={`absolute top-3 right-3 ${cornerLayer} flex gap-1.5 sm:top-4 sm:right-4 sm:gap-2`}>
        <IconButton label="Rules" onClick={() => setPopup("info")}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6M12 7.5v.5" />
        </IconButton>
        <IconButton label="Menu" onClick={() => setPopup("menu")}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </IconButton>
      </div>

      {/* Centre: the board during a game (each clock next to its own side on phones) */}
      {playing && (
      <div className="mt-10 flex flex-col items-center gap-3">
        {playing && clock && (
          <div className="self-start sm:hidden">{clockWithFlag(topColor, clock)}</div>
        )}
        <Board
          game={shown}
          onMove={move}
          interactive={interactive && !reviewing}
          flipped={flipped}
          showHints={hints}
          onIllegal={(from, to) => setNotice(explainIllegal(game, from, to) || "That move isn't allowed.")}
        />
        {playing && clock && (
          <div className="self-end sm:hidden">{clockWithFlag(bottomColor, clock)}</div>
        )}
      </div>
      )}

      {/* Bottom centre: move review controls and whose turn it is */}
      {playing && !waiting && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-sm text-muted">
          <div className="flex items-center gap-1">
            <button
              onClick={() => step(-1)}
              disabled={(viewPly ?? liveMoves) === 0}
              aria-label="Previous move"
              title="Previous move (←)"
              className="rounded-lg px-2 py-1 hover:bg-fg/10 disabled:opacity-30"
            >
              ◀
            </button>
            <span className="min-w-28 text-center tabular-nums">
              {reviewing ? (
                <span className="font-medium text-accent">
                  Move {viewPly} of {liveMoves}
                </span>
              ) : (
                `Move ${liveMoves}`
              )}
            </span>
            <button
              onClick={() => step(1)}
              disabled={!reviewing}
              aria-label="Next move"
              title="Next move (→)"
              className="rounded-lg px-2 py-1 hover:bg-fg/10 disabled:opacity-30"
            >
              ▶
            </button>
            {reviewing && (
              <button onClick={() => setViewPly(null)} className="rounded-lg px-2 py-1 text-accent hover:bg-fg/10">
                Back to game
              </button>
            )}
          </div>
          {!reviewing && (isOnline || bot) && !over && (
            <p>
              {game.turn === myColor ? "Your move" : bot ? "Bot is thinking…" : "Opponent's move"} · you are{" "}
              {myColor && colorName(myColor)}
              {opponent && ` · vs ${opponent}`}
              {hints && " · hints on"}
            </p>
          )}
          {/* Check is announced in words, not only by the red square. */}
          {!reviewing && !over && inCheck(game.board, game.turn) && (
            <p className="font-semibold text-red-600 dark:text-red-400" role="status">
              Check! {myColor ? (game.turn === myColor ? "Your king must escape." : "Their king is in check.") : `${colorName(game.turn)}'s king must escape.`}
            </p>
          )}
          {/* Shown only as the no-capture limit gets close, so the points rule is never a surprise. */}
          {!reviewing && !over && game.quietMoves >= QUIET_MOVE_LIMIT - 40 && (
            <p className="font-medium text-accent" title="At 50 moves each without a capture, the bigger sum of √n wins">
              {Math.ceil((QUIET_MOVE_LIMIT - game.quietMoves) / 2)} moves to points · White{" "}
              {rootSum(game.board, "w").toFixed(1)} – Black {rootSum(game.board, "b").toFixed(1)}
            </p>
          )}
          {over && resultHidden && (
            <button onClick={goHome} className="rounded-lg px-2 py-1 text-accent hover:bg-fg/10">
              Game over · back to home
            </button>
          )}
        </div>
      )}

      {/* Bottom left: subtle site name */}
      <span className="absolute bottom-3 left-4 font-math text-sm text-muted opacity-60">mess</span>

      {/* Bottom right: theme toggle */}
      <div className={`absolute right-4 bottom-4 ${cornerLayer}`}>
        <ThemeToggle />
      </div>

      {/* Why a move didn't work: beside the board for 3 seconds (above the move bar on phones). */}
      {notice && (
        <div
          key={notice}
          role="status"
          className="animate-pop-in fixed inset-x-4 bottom-20 z-30 rounded-xl border border-panel-border bg-panel px-4 py-3 text-sm shadow-lg backdrop-blur sm:inset-x-auto sm:top-1/2 sm:right-6 sm:bottom-auto sm:w-64 sm:-translate-y-1/2"
        >
          <p className="mb-1 text-xs font-semibold tracking-wide text-accent uppercase">Can&apos;t move there</p>
          <p>{notice}</p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {error}
        </div>
      )}

      {!playing && (
        <HomeScreen
          account={account}
          onRules={() => setPopup("info")}
          onProfile={() => setPopup("profile")}
          onAccount={() => setPopup("account")}
          panel={
            <>
          {home === "choose" && (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wide text-accent uppercase">Play</p>
              <Button onClick={() => setHome("bot")}>Play vs Bot</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setHome("create")}>
                  Create Game
                </Button>
                <Button variant="ghost" onClick={() => setHome("join")}>
                  Join Game
                </Button>
              </div>
              <p className="text-center text-xs text-muted">Create a game and send the code to a friend, on any device.</p>
            </div>
          )}
          {home === "bot" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Play vs Bot</h2>
              <div className="space-y-2" role="radiogroup" aria-label="Bot level">
                {(["tutorial", ...Object.keys(LEVELS)] as (Level | "tutorial")[]).map((l) => {
                  const info =
                    l === "tutorial"
                      ? { label: "Tutorial", blurb: "Easy bot, with dots showing where your pieces can move." }
                      : LEVELS[l];
                  return (
                    <button
                      key={l}
                      role="radio"
                      aria-checked={botLevel === l}
                      onClick={() => setBotLevel(l)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-left transition ${
                        botLevel === l ? "border-fg bg-fg text-bg" : "border-panel-border hover:bg-fg/5"
                      }`}
                    >
                      <span className="block font-medium">{info.label}</span>
                      <span className={`block text-xs ${botLevel === l ? "opacity-70" : "text-muted"}`}>{info.blurb}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <p className="mb-2 text-sm text-muted">You play</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Your colour">
                  {(["w", "random", "b"] as const).map((c) => (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={humanSide === c}
                      onClick={() => setHumanSide(c)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        humanSide === c ? "border-fg bg-fg text-bg" : "border-panel-border hover:bg-fg/5"
                      }`}
                    >
                      {c === "random" ? "Random" : colorName(c)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted">Time for each side</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Bot time control">
                  {TIME_CONTROLS_MIN.map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={minutes === m}
                      onClick={() => setMinutes(m)}
                      className={`rounded-xl border py-2 text-sm font-medium transition ${
                        minutes === m ? "border-fg bg-fg text-bg" : "border-panel-border hover:bg-fg/5"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={startBotGame}>Start</Button>
              <button onClick={() => setHome("choose")} className="w-full text-sm text-muted hover:text-fg">
                Back
              </button>
            </div>
          )}
          {home === "create" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">New game</h2>
              <div>
                <p className="mb-2 text-sm text-muted">Time for each player</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Time control">
                  {TIME_CONTROLS_MIN.map((m) => (
                    <button
                      key={m}
                      role="radio"
                      aria-checked={minutes === m}
                      onClick={() => setMinutes(m)}
                      className={`rounded-xl border py-2 font-medium transition ${
                        minutes === m ? "border-fg bg-fg text-bg" : "border-panel-border hover:bg-fg/5"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={createOnline} disabled={!onlineAvailable || online.busy}>
                {online.busy ? "Creating…" : "Create online game"}
              </Button>
              <Button variant="ghost" onClick={() => startLocal()}>
                Play on this device
              </Button>
              {!onlineAvailable && <p className="text-xs text-muted">Online play isn&apos;t set up on this server yet.</p>}
              <button onClick={() => setHome("choose")} className="w-full text-sm text-muted hover:text-fg">
                Back
              </button>
            </div>
          )}
          {home === "join" && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                joinOnline();
              }}
            >
              <h2 className="text-xl font-semibold">Join a game</h2>
              <input
                autoFocus
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="CODE"
                maxLength={CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Game code"
                className="w-full rounded-xl border border-panel-border bg-transparent px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] outline-none focus:border-accent"
              />
              <Button type="submit" disabled={joinCode.length !== CODE_LENGTH || online.busy || !onlineAvailable}>
                {online.busy ? "Joining…" : "Join"}
              </Button>
              <button type="button" onClick={() => setHome("choose")} className="w-full text-sm text-muted hover:text-fg">
                Back
              </button>
            </form>
          )}
            </>
          }
        />
      )}

      {waiting && popup === null && (
        <Modal title="Waiting for your opponent">
          <div className="space-y-4">
            <p className="text-sm text-muted">Send them this code. They choose Join Game and type it in.</p>
            <button
              onClick={() => navigator.clipboard?.writeText(online.code!).then(() => setCopied(true), () => {})}
              className="w-full rounded-xl border border-dashed border-panel-border py-4 font-mono text-3xl tracking-[0.3em] hover:bg-fg/5"
              title="Copy code"
            >
              {online.code}
            </button>
            <p className="text-center text-xs text-muted">
              {copied ? "Copied!" : "Click the code to copy it."} · {doc?.minutes ?? minutes} min each
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> Waiting…
            </div>
            <Button variant="ghost" onClick={goHome}>
              Cancel
            </Button>
          </div>
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
            {playing && !over && !waiting ? (
              <p className="text-sm text-muted">
                To resign, use the flag next to your clock. Use ← → (or ◀ ▶ under the board) to look back through the
                moves.
              </p>
            ) : playing ? (
              <Button onClick={goHome}>Back to home</Button>
            ) : (
              <p className="text-sm text-muted">Start or join a game to see match options here.</p>
            )}
          </div>
        </Modal>
      )}

      {popup === "profile" && (
        <Modal title="Profile" onClose={() => setPopup(null)}>
          <ProfilePanel account={account} onSignIn={() => setPopup("account")} />
        </Modal>
      )}

      {popup === "account" && (
        <Modal title="Account" onClose={() => setPopup(null)}>
          <AccountPanel account={account} inGame={playing && !over} />
        </Modal>
      )}

      {popup === "settings" && (
        <Modal title="Settings" onClose={() => setPopup(null)} wide>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Look</h3>
            <LookPicker />
            <p className="text-xs text-muted">Light or dark is the switch in the bottom-right corner. Each look has both.</p>
          </div>
        </Modal>
      )}

      {firstGameNotice && playing && !waiting && popup === null && (
        <Modal title="Your first game">
          <div className="space-y-3 text-sm">
            <p>
              In this game only, <b>dots show where each piece can move</b>.
            </p>
            <p>
              After this game, you&apos;re on your own: work out every move from the maths. √n jumps a squares one way and b
              the other, where a² + b² = n, and equal sides move in a straight line.
            </p>
            <p className="text-muted">
              Want the dots back? Choose <b>Tutorial</b> in Play vs Bot. The rules (i) always show every piece&apos;s moves.
            </p>
            <Button onClick={() => setFirstGameNotice(false)}>Got it</Button>
          </div>
        </Modal>
      )}

      {playing && over && popup === null && !resultHidden && (
        <Modal title={resultTitle(game, myColor)}>
          <p className="mb-4 text-sm text-muted">
            {resultDetail(game)} after {game.history.length} {game.history.length === 1 ? "move" : "moves"}.
          </p>
          <div className="space-y-2">
            <Button onClick={goHome}>Back to home</Button>
            <Button variant="ghost" onClick={() => setResultHidden(true)}>
              Review the game
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function resultTitle(g: GameState, me: Color | null) {
  const s = g.status;
  if ("winner" in s) {
    if (me) return s.winner === me ? "You win!" : "You lose";
    return `${colorName(s.winner)} wins`;
  }
  return "Draw";
}

function resultDetail(g: GameState) {
  const s = g.status;
  switch (s.kind) {
    case "checkmate":
      return "Checkmate";
    case "resigned":
      return `${colorName(s.winner === "w" ? "b" : "w")} resigned`;
    case "timeout":
      return `${colorName(s.winner === "w" ? "b" : "w")} ran out of time`;
    case "stalemate":
      return "Stalemate";
    case "points":
      return `50 moves without a capture: maths points ${s.w.toFixed(2)} (White) vs ${s.b.toFixed(2)} (Black)`;
    case "draw":
      return s.reason === "only-kings" ? "Only the kings are left" : "50 moves without a capture, and maths points are exactly equal";
    default:
      return "";
  }
}
