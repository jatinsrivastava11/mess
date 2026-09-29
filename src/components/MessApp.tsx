"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Clock, TIME_CONTROLS_MIN, type TimeControl, flagged, pressClock, startClock, stopClock } from "@/lib/game/clock";
import { type Color, type GameState, makeMove, newGame, resign, timeout } from "@/lib/game/engine";
import { randomSeed } from "@/lib/game/rng";
import { askBot } from "@/lib/bot/askBot";
import { LEVELS, type Level } from "@/lib/bot/search";
import { useAccount } from "@/lib/account/useAccount";
import { onlineAvailable } from "@/lib/firebase/client";
import { CODE_LENGTH, CODE_PATTERN, replay } from "@/lib/online/game-doc";
import { useOnlineGame } from "@/lib/online/useOnlineGame";
import { AccountPanel, ProfilePanel } from "./AccountPanels";
import { Board } from "./Board";
import { ClockFace, IconButton, ThemeToggle, colorName } from "./Controls";
import { Logo } from "./Logo";
import { Button, Modal } from "./Modal";
import { Rules } from "./Rules";

type Popup = null | "info" | "menu" | "profile" | "account" | "settings";
type Home = "choose" | "create" | "join" | "bot";

/** A game on this one device: pass-and-play, or against the bot. */
interface LocalGame {
  game: GameState;
  clock: Clock;
  bot?: { level: Level; color: Color };
}

const DEMO = newGame(2026); // the board behind the home popup

export function MessApp() {
  const online = useOnlineGame();
  const account = useAccount();
  const [local, setLocal] = useState<LocalGame | null>(null);
  const [home, setHome] = useState<Home>("choose");
  const [popup, setPopup] = useState<Popup>(null);
  const [botLevel, setBotLevel] = useState<Level>("medium");
  const [humanSide, setHumanSide] = useState<Color | "random">("random");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [minutes, setMinutes] = useState<TimeControl>(10);
  const [now, setNow] = useState(0);
  // Online move shown straight away while the server confirms it.
  const [pending, setPending] = useState<{ from: number; to: number; ply: number } | null>(null);
  const flagSent = useRef(false);

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
    bot ? (c === bot.color ? `Bot · ${LEVELS[bot.level].label}` : "You") : (doc?.names?.[c] ?? colorName(c));
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

  function startLocal(withBot?: LocalGame["bot"]) {
    const t = Date.now();
    setLocal({ game: newGame(randomSeed()), clock: startClock(minutes, t), bot: withBot });
    setNow(t);
    setPopup(null);
  }

  function startBotGame() {
    const human: Color = humanSide === "random" ? (Math.random() < 0.5 ? "w" : "b") : humanSide;
    startLocal({ level: botLevel, color: human === "w" ? "b" : "w" });
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
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function joinOnline() {
    if (!CODE_PATTERN.test(joinCode)) return setError("Game codes are 6 letters and numbers.");
    try {
      await online.join(joinCode);
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
  const cornerLayer = !playing && popup === null ? "z-50" : "z-10";
  const interactive =
    playing && !over && !waiting && (isOnline ? game.turn === myColor && !pendingActive : !botToMove);

  return (
    <main className="relative flex h-dvh w-full items-center justify-center">
      {/* Top centre: spotlighted title */}
      <header className="spotlight pointer-events-none absolute inset-x-0 top-0 flex h-28 justify-center pt-3">
        <div className="flex h-9 items-center gap-2 sm:h-10">
          <Logo className="h-6 w-6 sm:h-8 sm:w-8" />
          <h1 className="font-math text-2xl font-bold tracking-tight sm:text-3xl">mess</h1>
        </div>
      </header>

      {/* Top left: chess clocks while playing (above/below the board on phones), otherwise profile / account / settings */}
      <div className={`absolute top-3 left-3 ${cornerLayer} flex items-center gap-1.5 sm:top-4 sm:left-4 sm:gap-2`}>
        {playing && clock ? (
          <div className="hidden flex-col gap-1.5 sm:flex">
            <ClockFace color={topColor} clock={clock} now={now} label={nameOf(topColor)} />
            <ClockFace color={bottomColor} clock={clock} now={now} label={nameOf(bottomColor)} />
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

      {/* Centre: the board, with each clock next to its own side on phones */}
      <div className="mt-10 flex flex-col items-center gap-3">
        {playing && clock && (
          <div className="self-start sm:hidden">
            <ClockFace color={topColor} clock={clock} now={now} label={nameOf(topColor)} />
          </div>
        )}
        <Board game={game} onMove={move} interactive={interactive} flipped={flipped} />
        {playing && clock && (
          <div className="self-end sm:hidden">
            <ClockFace color={bottomColor} clock={clock} now={now} label={nameOf(bottomColor)} />
          </div>
        )}
      </div>

      {(isOnline || bot) && !waiting && !over && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-muted">
          {game.turn === myColor ? "Your move" : bot ? "Bot is thinking…" : "Opponent's move"} · you are{" "}
          {myColor && colorName(myColor)}
          {opponent && ` · vs ${opponent}`}
        </p>
      )}

      {/* Bottom left: subtle site name */}
      <span className="absolute bottom-3 left-4 font-math text-sm text-muted opacity-60">mess</span>

      {/* Bottom right: theme toggle */}
      <div className={`absolute right-4 bottom-4 ${cornerLayer}`}>
        <ThemeToggle />
      </div>

      {error && (
        <div
          role="alert"
          className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white shadow-lg"
        >
          {error}
        </div>
      )}

      {!playing && popup === null && (
        <Modal>
          {home === "choose" && (
            <div className="space-y-3 text-center">
              <div className="mb-5 flex flex-col items-center gap-2">
                <Logo className="h-12 w-12" />
                <p className="text-sm text-muted">Chess where every piece is a square root.</p>
              </div>
              <Button onClick={() => setHome("create")}>Create Game</Button>
              <Button variant="ghost" onClick={() => setHome("join")}>
                Join Game
              </Button>
              <Button variant="ghost" onClick={() => setHome("bot")}>
                Play vs Bot
              </Button>
            </div>
          )}
          {home === "bot" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Play vs Bot</h2>
              <div className="space-y-2" role="radiogroup" aria-label="Bot level">
                {(Object.keys(LEVELS) as Level[]).map((l) => (
                  <button
                    key={l}
                    role="radio"
                    aria-checked={botLevel === l}
                    onClick={() => setBotLevel(l)}
                    className={`w-full rounded-xl border px-4 py-2.5 text-left transition ${
                      botLevel === l ? "border-fg bg-fg text-bg" : "border-panel-border hover:bg-fg/5"
                    }`}
                  >
                    <span className="block font-medium">{LEVELS[l].label}</span>
                    <span className={`block text-xs ${botLevel === l ? "opacity-70" : "text-muted"}`}>{LEVELS[l].blurb}</span>
                  </button>
                ))}
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
        </Modal>
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
              <>
                <p className="text-sm text-muted">
                  {isOnline || bot
                    ? "Resigning ends the game as a loss for you."
                    : `Resigning ends the game as a loss for ${colorName(game.turn)}.`}
                </p>
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
        <Modal title="Settings" onClose={() => setPopup(null)}>
          <p className="text-sm text-muted">Settings are coming later.</p>
        </Modal>
      )}

      {playing && over && popup === null && (
        <Modal title={resultTitle(game, myColor)}>
          <p className="mb-4 text-sm text-muted">
            {resultDetail(game)} after {game.history.length} {game.history.length === 1 ? "move" : "moves"}.
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

function resultTitle(g: GameState, me: Color | null) {
  const s = g.status;
  if (s.kind === "checkmate" || s.kind === "resigned" || s.kind === "timeout") {
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
    case "draw":
      return s.reason === "only-kings" ? "Only the kings are left" : "50 moves each without a capture";
    default:
      return "";
  }
}
