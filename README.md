# mess

**Maths + Chess.** An 8×8 chess variant where every piece is a square root, and it moves along the right triangle whose hypotenuse it is.

√5 jumps 1 square one way and 2 the other, because 1² + 2² = 5. That's the knight, rediscovered as a radical.

## How it plays

- **Board:** a standard 8×8 board.
- **Setup:** each player gets their king and **7 random pieces** on their back row. The two sides are drawn *independently*, so no two games (or armies) are alike.
- **Movement:** a piece √n can **jump** to any square (dx, dy) where dx² + dy² = n. Pieces in between never block it. If n can be written as a sum of two squares in more than one way, the piece gets all of them. For example, **5** (= √25) jumps (3, 4) *or* (0, 5).
- **The king** is **1** (drawn with a crown). It steps one square in any direction, like a chess king.
- **Capturing:** land on an enemy piece. You can't land on your own.
- **Check:** you may never leave your own king under attack.
- **Winning:** checkmate the opponent's king, or they resign.
- **Draws:** stalemate (no legal move but not in check), only the two kings left, or 50 moves each with no capture.

## The pieces

A piece is only allowed if it has at least one move from **every** square of the board. On 8×8 that means each leg of the triangle is at most 4. A leg of 5 or more gets stuck on the centre squares. Perfect squares are written as whole numbers.

| Piece | Jumps (dx, dy) | | Piece | Jumps (dx, dy) |
|---|---|---|---|---|
| **1** (king) | one step, any direction | | **√13** | (2, 3) |
| **√2** | (1, 1) | | **4** = √16 | (0, 4) |
| **2** = √4 | (0, 2) | | **√17** | (1, 4) |
| **√5** | (1, 2), the knight | | **√18** | (3, 3) |
| **√8** | (2, 2) | | **√20** | (2, 4) |
| **3** = √9 | (0, 3) | | **5** = √25 | (3, 4) or (0, 5) |
| **√10** | (1, 3) | | **√32** | (4, 4) |

√3, √6, √7, ... never appear: they can't be written as a sum of two squares. The pool isn't typed in by hand. [`computePool()`](src/lib/game/pieces.ts) derives it from the rules, so it would adapt to any board size.

## Features

- [x] Game engine: piece pool, seeded random boards, legal moves, check, checkmate, stalemate, draws (with tests)
- [x] Home popup with **Create Game** (copyable code) and **Join Game** (enter a code)
- [x] Big centred board, match timer, rules (i) popup, menu with resign, light/dark toggle
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
    rng.ts             seeded random numbers
    engine.test.ts     tests for all of the above
```

See [NOTES.md](NOTES.md) for the concepts behind the code and what to learn next.
