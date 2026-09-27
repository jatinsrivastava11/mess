# mess

**Maths + Chess.** An 8×8 chess variant where every piece is a square root, and it moves along the right triangle whose hypotenuse it is.

√5 jumps 1 square one way and 2 the other, because 1² + 2² = 5. That's the knight, rediscovered as a radical.

## How it plays

- **Board:** a standard 8×8 board.
- **Setup:** each player gets their king and **7 random pieces** on their back row. The two sides are drawn *independently*, so no two games (or armies) are alike.
- **Movement:** a piece √n is the hypotenuse of a right triangle with whole-number sides a, b ≥ 1 (a² + b² = n). It **jumps** like a knight: a squares one way, b the other. Pieces in between never block it.
- **Equal sides move straight:** when a = b (√2, √8, √18, √32), the piece jumps a squares in a straight line (up, down, left or right). √2 steps 1, √8 jumps 2, and so on.
- If n can be split into two squares in more than one way, the piece gets every split. This only happens on bigger boards: √50 = 1² + 7² = 5² + 5².
- **The king** is **1** (drawn with a crown). It steps one square in any direction, like a chess king.
- **Capturing:** land on an enemy piece. You can't land on your own.
- **Check:** you may never leave your own king under attack.
- **Winning:** checkmate the opponent's king, or they resign.
- **Clock:** each player has their own clock (3, 5 or 10 minutes). Only the player to move loses time. If your clock hits zero, you lose.
- **Draws:** stalemate (no legal move but not in check), only the two kings left, or 50 moves each with no capture.

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
- [x] Home popup with **Create Game** (copyable code) and **Join Game** (enter a code)
- [x] Chess clock for each player (3, 5 or 10 minutes, picked when creating a game). Running out of time loses.
- [x] Big centred board, rules (i) popup, menu with resign, light/dark toggle
- [x] Phone layout: board fills the width, clocks sit above and below it
- [ ] Email + password accounts (Supabase Auth)
- [ ] Real online play: create/join by code, moves synced live (Supabase Realtime)
- [ ] Profile: wins and achievements
- [ ] Settings
- [ ] **Phase 2:** play against a bot

Right now Create/Join works **on one device**. The code is the board's seed, so the same code always rebuilds the same board.

## Tech

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- Tailwind CSS
- [Vitest](https://vitest.dev) for engine tests
- Planned: [Supabase](https://supabase.com) (free tier) for auth, Postgres and realtime, deployed on [Vercel](https://vercel.com)

## Run it locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # engine tests
npm run build   # production build
```

## Project layout

```
src/
  app/                 Next.js entry: layout, page, global styles/theme
  components/          UI: Board, PieceLabel, Rules, Modal, Logo, MessApp (the shell)
  lib/game/
    pieces.ts          which pieces exist and how they move
    engine.ts          rules: setup, legal moves, check/mate/stalemate/draws
    clock.ts           chess clock (pure functions, tested)
    rng.ts             seeded random numbers
    *.test.ts          tests
```

See [NOTES.md](NOTES.md) for the concepts behind the code and what to learn next.
