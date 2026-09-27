# Notes: what this project is made of, and what to learn from it

A study guide for the concepts, languages and tools inside mess, roughly in the order worth learning them. Each section says **where it appears in this repo**, so you can read real code next to the theory.

---

## 1. The maths

### Sums of two squares
A piece √n exists only if n = a² + b² for whole numbers a, b ≥ 1. Which numbers can be written this way?
**Fermat's theorem on sums of two squares:** n is a sum of two squares exactly when every prime ≡ 3 (mod 4) in its factorisation appears an even number of times. That's why √3, √6, √7, √11, √12 ... never show up. 3 is a prime ≡ 3 (mod 4) appearing once.
- Where: `computePool()` in `src/lib/game/pieces.ts` brute-forces it instead of using the theorem. Try proving they agree.
- Learn: modular arithmetic, Gaussian integers (a + bi), and why 50 = 1² + 7² = 5² + 5² has two representations.

### Symmetry and vectors
Each side pair (a, b) with a ≠ b becomes 8 jump vectors: (±a, ±b) and (±b, ±a). That's the symmetry group of the square (the **dihedral group D4**). Equal sides (a, a) use a house rule instead: 4 straight jumps (±a, 0) and (0, ±a).
- Where: `movesFromLegs()`.

### Parity / colour-binding
A jump (dx, dy) changes square colour only when dx + dy is odd. So √8 (2 straight), √10 (1, 3), √20 (2, 4) and √32 (4 straight) stay on one colour forever, like bishops. √2, √5, √13, √17, √18 and 5 can switch. √8 and √32 are even more trapped: they change each coordinate by an even amount, so they only reach a quarter of the board. Can you work out exactly which squares each piece can reach? (Hint: graph connectivity, section 3.)

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
- **Clocks without drift:** `clock.ts` never counts down with a timer. It stores *time left when the turn began* plus *when it began*, and computes `left = remaining − (now − since)`. `setInterval` only redraws the screen. Timers in browsers are unreliable (background tabs slow them down), but subtracting timestamps is always right. The same idea will keep two devices' clocks in sync online.
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
- **Responsive sizing:** `w-[min(76vh,94vw)]` makes the board as big as fits. `sm:` prefixes switch layout at 640px wide. On phones the clocks move from the top-left corner to above and below the board.
- **Accessibility:** `aria-label`s on icon buttons and squares, `role="dialog"`, and closing popups with Escape.
- **Avoiding a theme flash:** a tiny inline script in `layout.tsx` sets dark mode *before* React loads.

---

## 8. Backend, databases and security

- **Client–server architecture:** two phones can't talk directly, so moves go phone → server → database → other phone.
- **Firebase Auth:** each browser signs in (anonymously for now) and gets an **ID token**, a signed JWT that proves who it is. The API verifies it on every request (`requireUid` in `src/lib/online/server.ts`). Learn what a JWT is and why it's signed.
- **Cloud Firestore (NoSQL):** data lives in *documents* inside *collections* (`games/{code}`) instead of SQL tables and rows. Compare with SQL: when is each better?
- **Realtime listeners:** `onSnapshot` in `useOnlineGame.ts` keeps a live connection open, so the opponent's move appears without refreshing. Under the hood this is WebSockets/long-polling.
- **Never trust the client:** browsers can be modified. So the browser may only *read* its own games (`firestore.rules`), and every change goes through `src/app/api/games`, which replays the game and checks the move with the same `engine.ts`. `game-doc.test.ts` tests these server rules.
- **Transactions:** `updateGame` reads and writes inside a transaction, so two requests at the same moment can't both "win" (a race condition).
- **Idempotency and stale requests:** each move carries `ply` (how many moves the client saw), so a double click or an old tab can't play twice.
- **Clock sync:** device clocks disagree. Every API response includes `serverNow`, and the browser keeps the offset. See Cristian's algorithm and NTP.
- **Secrets:** `NEXT_PUBLIC_*` values are shipped to every browser, so they must be safe to publish. The service-account key is server-only and git-ignored. Learn how environment variables work and why leaked keys get scraped from GitHub within minutes.
- **Security testing:** this build was attacked with forged tokens, strangers, illegal moves and direct database writes. All were rejected. Try writing an automated test with `@firebase/rules-unit-testing`.
- **Emulators:** `npm run dev:online` runs a fake Firebase on your laptop, so you can build and test without touching production data.
- Coming with accounts: password hashing (bcrypt/scrypt), email verification, rate limiting, CAPTCHA/App Check.

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
