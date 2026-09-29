# mess

**Maths + Chess.** An 8×8 chess variant where every piece is a square root, and it moves along the right triangle whose hypotenuse it is.

√5 jumps 1 square one way and 2 the other, because 1² + 2² = 5. That's the knight, rediscovered as a radical.

## How it plays

- **Board:** a standard 8×8 board.
- **Setup:** each player fills their back two rows: the king (on the back row) and **15 random pieces**. The two sides are drawn *independently*, so no two games (or armies) are alike.
- **Movement:** a piece √n is the hypotenuse of a right triangle with whole-number sides a, b ≥ 1 (a² + b² = n). It **jumps** like a knight: a squares one way, b the other. Pieces in between never block it.
- **Equal sides move straight:** when a = b (√2, √8, √18, √32), the piece jumps a squares in a straight line (up, down, left or right). √2 steps 1, √8 jumps 2, and so on.
- If n can be split into two squares in more than one way, the piece gets every split. This only happens on bigger boards: √50 = 1² + 7² = 5² + 5².
- **The king** is **1** (drawn with a crown). It steps one square in any direction, like a chess king.
- **Capturing:** land on an enemy piece. You can't land on your own.
- **Check:** you may never leave your own king under attack.
- **Winning:** checkmate the opponent's king, or they resign or run out of time.
- **Maths points:** after 50 moves each with no capture, each side adds up √n for its pieces on the board (the king doesn't count), and the bigger sum wins. A counter appears as the limit approaches.
- **Clock:** each player has their own clock (3, 5 or 10 minutes). Only the player to move loses time. If your clock hits zero, you lose.
- **Draws:** stalemate (no legal move but not in check), only the two kings left, or exactly equal maths points.

**Why these rules?** With the first version (8 pieces each, a draw after 50 quiet moves), bot-vs-bot tests showed 97% of games were draws: jumping pieces make it easy to dodge forever. Testing alternatives showed 16 pieces gives real checkmates in about half of games, and maths points settles the rest: now about 62% end in checkmate and under 3% are drawn.

## The pieces

A piece is only allowed if it has at least one move from **every** square of the board. On 8×8 that means each side of the triangle is at most 4. A side of 5 or more gets stuck on the centre squares. Sides must be at least 1: 2 = √(0² + 2²) is a flat line, not a triangle, so it isn't a piece. Perfect squares are written as whole numbers.

| Piece | Sides | Moves | | Piece | Sides | Moves |
|---|---|---|---|---|---|---|
| **1** (king) | n/a | one step, any direction | | **√17** | 1, 4 | knight-style (1, 4) |
| **√2** | 1, 1 | 1 straight | | **√18** | 3, 3 | 3 straight |
| **√5** | 1, 2 | knight-style (1, 2), the knight | | **√20** | 2, 4 | knight-style (2, 4) |
| **√8** | 2, 2 | 2 straight | | **5** = √25 | 3, 4 | knight-style (3, 4) |
| **√10** | 1, 3 | knight-style (1, 3) | | **√32** | 4, 4 | 4 straight |
| **√13** | 2, 3 | knight-style (2, 3) | | | | |

√3, √6, √7, ... never appear: they can't be written as a sum of two squares. The pool isn't typed in by hand. [`computePool()`](src/lib/game/pieces.ts) derives it from the rules, so it adapts to any board size:

| Board | 6×6 | **8×8** | 10×10 | 12×12 | 14×14 | 16×16 |
|---|---|---|---|---|---|---|
| Pieces | 6 | **10** | 15 | 21 | 27 | 34 |

(An odd size gives the same pool as the even size just below it, because the centre square is the limit.)

## Features

- [x] Game engine: piece pool, seeded random boards, legal moves, check, checkmate, stalemate, draws (with tests)
- [x] **Online play across devices:** Create Game gives a 6-letter code, and the opponent joins with it on any device. Moves and clocks sync live.
- [x] Every move is checked on the server. Players can't write to the database directly, so a modified browser can't cheat.
- [x] Pass-and-play on one device
- [x] Chess clock for each player (3, 5 or 10 minutes, picked when creating a game). Running out of time loses.
- [x] Big centred board, rules (i) popup, light/dark toggle
- [x] **No move hints** after your first game ever (it opens with a notice explaining this); **Tutorial** games vs the bot bring the dots back. Illegal tries get a message.
- [x] **Move review:** ← → (or ◀ ▶) step through earlier positions without changing the game; Home/End jump to the start/live position
- [x] **Resign** with the flag next to your clock (two taps to confirm)
- [x] **Three looks** (Settings): Classic, Chalkboard and Blueprint, each with light and dark. All pass WCAG AA contrast (4.5:1 or better), and the two sides differ by fill as well as colour for colourblind players.
- [x] Keyboard focus outlines, reduced-motion support, "Check!" said in words, and a pulsing clock under 20 seconds
- [x] Phone layout: board fills the width, clocks sit above and below it
- [x] **Accounts:** email + password with a unique username. Guests can still play; accounts save wins.
- [x] **Profile:** username and wins (achievements coming). Wins count only for verified emails, only after 10+ moves, and are recorded by the server.
- [ ] Achievements
- [ ] Elo rating
- [ ] Bot protection (App Check / reCAPTCHA) once the site has its public address
- [ ] Settings
- [x] **Play vs Bot:** Easy, Medium and Hard. The bot runs in your browser, so it's free and works offline. Its piece values were learned by self-play (the trained bot beats the untrained one 58% of the time), and it knows the maths-points rule. Level check: a beginner who just grabs free pieces beats Easy more often than not; Medium beats Easy 99%; Hard beats Medium 75%.

Guests play with an invisible identity. Creating an account upgrades that same identity, so a game in progress isn't lost.

### Security

- Passwords are handled by Firebase Auth. We never see or store them. At least 8 characters with a number, enforced by Firebase itself.
- Email verification is required before wins count. Password reset goes through email.
- Email-enumeration protection is on: login errors never reveal whether an email has an account.
- The database is read-only from browsers (`firestore.rules`). Games are visible only to their two players, and profiles show only username and wins (never email).
- Every write (moves, usernames, wins) goes through the API routes, which verify the user's token and re-check the game with the engine inside a transaction.
- Secrets (`service-account.json`, `.env*.local`) are git-ignored and never reach the browser.

## Tech

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- [Vitest](https://vitest.dev) for engine tests
- [Firebase](https://firebase.google.com) (free Spark plan): Authentication plus Cloud Firestore for live game updates
- Next.js API routes (on [Vercel](https://vercel.com), free Hobby plan) validate every move with the Firebase Admin SDK

## Run it locally

Needs Node 20+ and, for online play, Java 21+ (the Firebase emulators run on it).

```bash
npm install
cp .env.example .env.local   # emulator settings, no real Firebase needed
npm run dev:online           # app + local Firebase emulators → http://localhost:3100
npm run dev                  # app only (pass-and-play works, online needs the emulators)
npm test                     # engine, clock and online-rules tests
npm run build                # production build
npm run train:bot            # self-play training (Texel tuning); only saves weights that win
npm run bot:levels           # check Easy < Medium < Hard by bot-vs-bot matches
```

To try online play locally, open the site in two different browsers (or one normal and one private window), create a game in one and join from the other.

## Project layout

```
firestore.rules        who may read what (only players read their game; nobody writes directly)
firebase.json          emulator + rules config
src/
  app/                 Next.js entry: layout, page, global styles/theme
    api/games/         server routes: create / join / move / resign / flag
    api/account/       server route: check / claim a username
  components/          UI: Board, PieceLabel, Rules, Modal, Logo, Controls, AccountPanels, LookPicker, MessApp (the shell)
  lib/game/
    pieces.ts          which pieces exist and how they move
    engine.ts          rules: setup, legal moves, check/mate/stalemate/draws
    clock.ts           chess clock (pure functions, tested)
    rng.ts             seeded random numbers
  lib/online/
    game-doc.ts        an online game as stored, and the server-side rules for changing it
    server.ts          API plumbing: token check, transactions
    useOnlineGame.ts   React hook: create/join, live updates, server-synced clock
  lib/bot/
    board.ts           fast mutable board for searching (tested against engine.ts)
    evaluate.ts        how good a position is: piece values, mobility, king danger
    search.ts          alpha-beta look-ahead and the Easy/Medium/Hard levels
    weights.ts         piece values learned by self-play training
    bot.worker.ts      runs the bot in a background thread
  lib/account/         username/password rules, useAccount hook (sign up/in/out, verify, reset)
  lib/firebase/        Firebase setup for the browser (client.ts, api.ts) and server (admin.ts)
  **/*.test.ts         tests, next to the code they test
scripts/
  arena.ts             bot-vs-bot games
  train-bot.ts         self-play training (Texel tuning)
  level-check.ts       matches between the levels
```

See [NOTES.md](NOTES.md) for the concepts behind the code and what to learn next.
