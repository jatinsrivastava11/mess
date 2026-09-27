# Notes: what this project is made of, and what to learn from it

A study guide for the concepts, languages and tools inside mess, roughly in the order worth learning them. Each section says **where it appears in this repo**, so you can read real code next to the theory.

---

## 1. The maths

### Sums of two squares
A piece √n exists only if n = a² + b² for whole numbers a, b. Which numbers can be written this way?
**Fermat's theorem on sums of two squares:** n is a sum of two squares exactly when every prime ≡ 3 (mod 4) in its factorisation appears an even number of times. That's why √3, √6, √7, √11, √12 ... never show up. 3 is a prime ≡ 3 (mod 4) appearing once.
- Where: `computePool()` in `src/lib/game/pieces.ts` brute-forces it instead of using the theorem. Try proving they agree.
- Learn: modular arithmetic, Gaussian integers (a + bi), and why 25 = 3² + 4² = 0² + 5² has two representations.

### Symmetry and vectors
Each leg pair (a, b) becomes up to 8 jump vectors: (±a, ±b) and (±b, ±a). That's the symmetry group of the square (the **dihedral group D4**).
- Where: `vectorsFromLegs()`.

### Parity / colour-binding
A jump (a, b) changes square colour only when a + b is odd. So √2, 2, √8, √10, 4, √18, √20 and √32 stay on one colour forever, like bishops. Only √5, 3, √13, √17 and 5 can switch. Some are even more trapped: 2 = (0, 2) only ever changes each coordinate by an even amount, so it can reach just a quarter of the board. Can you work out exactly which squares each piece can reach? (Hint: graph connectivity, section 3.)

---

## 2. TypeScript and JavaScript

- **Types, interfaces, union types:** `Status` in `engine.ts` is a *discriminated union*. The `kind` field tells TypeScript which other fields exist.
- **Immutability:** `makeMove()` never changes the old state. It returns a new one (`board.slice()`, `{...state}`). React depends on this.
- **Pure functions:** the engine has no DOM, no network and no randomness except through a seed. That's what makes it testable.
- **Array methods:** `map`, `filter`, `some`, `every`, `findIndex`.
- Learn: [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html), then "JavaScript: The Good Parts" style closures and scope.

---

## 3. Algorithms and data structures

- **Board as a 1D array:** square = row × 8 + col. Converting back uses `/` and `%`. It's the same trick as storing images or matrices in memory.
- **Move generation:** try every vector and keep the ones that land on the board and not on a friend.
- **Legal vs pseudo-legal moves:** a move is legal only if, after playing it, your king isn't attacked. The engine *simulates* each move and checks. That's simple, but not the fastest way.
- **Reverse attack lookup:** `isAttacked()` looks *outward from the target square* using each piece type's vectors, because moves are symmetric.
- **Seeded pseudo-random numbers:** `rng.ts` (mulberry32). The same seed gives the same board, so two players can share one number instead of a whole board.
- **Game trees (for Phase 2, the bot):** minimax, alpha–beta pruning, evaluation functions. See the Chess Programming Wiki.
- **Graph theory:** each piece's moves form a graph on 64 squares. Knight's tours are Hamiltonian paths on the √5 graph.

---

## 4. Testing

- **Unit tests with Vitest:** `src/lib/game/engine.test.ts`. Each test builds a small position, makes a move and checks the result.
- **Writing tests from hand-worked examples:** the checkmate and stalemate positions were traced on paper first. When a test fails, check whether the *test* is wrong before blaming the code. That happened twice while building this.
- Learn: test-driven development (TDD), and the difference between unit, integration and end-to-end tests (Playwright).

---

## 5. React

- **Components and props:** `Board`, `PieceLabel`, `Modal`.
- **State:** `useState` in `MessApp.tsx` holds the game, which popup is open, the timer and so on. The UI is a *function of state*.
- **Effects:** `useEffect` runs the timer and cleans up with `clearInterval`. Don't use effects for things you can compute during render (the linter caught one of these).
- **Lifting state up:** `Board` doesn't own the game. It calls `onMove` and the parent updates the state.
- **Controlled inputs:** the join-code box.
- Learn: [react.dev/learn](https://react.dev/learn), especially "Thinking in React" and "You Might Not Need an Effect".

---

## 6. Next.js

- **App Router:** `src/app/layout.tsx` wraps every page, and `src/app/page.tsx` is `/`.
- **Server vs client components:** files starting with `"use client"` run in the browser (they need state or clicks). Everything else can render on the server.
- **Static prerendering:** `npm run build` shows `○ /`, meaning the page is built once into HTML.
- Learn: the Next.js docs "Learn" course. This repo uses Next 16, so read `node_modules/next/dist/docs/` for version-specific details.

---

## 7. CSS and design

- **Tailwind CSS:** utility classes like `flex`, `rounded-xl`, `dark:hidden`.
- **CSS custom properties (variables):** all colours live in `globals.css` under `:root` and `.dark`. Dark mode just swaps the variables.
- **CSS Grid:** the board is `grid-cols-8 grid-rows-8`. Without `grid-rows-8`, rows grew to fit their content and weren't square (a real bug found while building).
- **Responsive sizing:** `w-[min(76vh,94vw)]` makes the board as big as fits.
- **Accessibility:** `aria-label`s on icon buttons and squares, `role="dialog"`, and closing popups with Escape.
- **Avoiding a theme flash:** a tiny inline script in `layout.tsx` sets dark mode *before* React loads.

---

## 8. Coming next: backend and databases

- **Supabase:** a hosted **PostgreSQL** database plus Auth plus Realtime.
- **SQL:** tables, primary and foreign keys, `SELECT/INSERT/UPDATE`, indexes.
- **Row Level Security (RLS):** database rules like "only the two players in a game can write moves". This is security at the data layer.
- **Authentication:** password hashing, sessions and JWTs. You'll never store passwords yourself, and you should learn why.
- **Realtime / WebSockets:** how the opponent's move appears on your screen without refreshing.
- **Server authority:** never trust the client. The server (or a database function) should re-check that every move is legal using the same `engine.ts`.
- **Environment variables:** `.env.local` keeps keys out of git.

---

## 9. Tools and workflow

- **Git and GitHub:** small commits with clear messages, and pushes after each working step.
- **npm:** `package.json` scripts, dependencies vs devDependencies, and peer-dependency conflicts (we hit one: vitest needed newer `@types/node`).
- **ESLint:** catches bugs and bad patterns before they run.
- **Deploying:** Vercel builds straight from GitHub on every push.

---

## Suggested learning order
1. TypeScript basics → read `pieces.ts` and `engine.ts` top to bottom.
2. Tests → add one of your own (for example, "√18 never changes square colour").
3. React → read `Board.tsx`, then `MessApp.tsx`.
4. CSS/Tailwind → change the colour theme in `globals.css`.
5. SQL + Supabase → as we build accounts and online play.
6. Algorithms → minimax for the Phase 2 bot.
