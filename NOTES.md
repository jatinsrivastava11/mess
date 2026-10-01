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
- **Game trees (the bot, `src/lib/bot/`):** see section 9.
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
- **Pointer events for drag and drop (`Board.tsx`):** one API covers mouse, pen and touch. A press only becomes a drag after moving 6 px, so taps still work. `setPointerCapture` keeps the drag alive when the pointer leaves the square, and `touch-action: none` stops the page scrolling under your finger. The square under the pointer comes from maths on the board's rectangle, not from hit-testing elements.
- **Helpful errors without spoilers (`explain.ts`):** the message is computed only from the square you tried, never from the legal-move list. Writing its tests revealed a fact about mess: every piece jumps, so **pins are impossible**. Moving one piece can never expose your king.
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
- **A visual rule (art-bible method, from Claude Code Game Studios):** "a sheet of maths: the board is the equation, pieces are numbers, everything else is a margin note." One sentence like this settles design arguments. Principles: the board is the game (other things appear only when relevant), numbers are the art, calm until it matters.
- **Theming with CSS variables:** each look (`[data-look="chalk"]` and so on) only redefines variables such as `--sq-light` and `--piece-b-bg`. Because the selector matches any element, the Settings previews can show a different look than the page (see `LookPicker.tsx`).
- **Contrast is measurable:** WCAG contrast ratio = (L1 + 0.05) / (L2 + 0.05), using relative luminance. Aim for 4.5:1 or more for text. The looks were tested this way in a real browser, and it caught grey text at 4.29:1, which was then fixed. The test itself had a bug at first: it didn't understand `#fff` or `#ffffff0f` colours. Test your tests.
- **Glow with `box-shadow`:** the Neon look is all layered shadows: `0 0 16px` spreads light around the frame, `inset` shadows light squares from inside, and `text-shadow` makes the title glow. No images needed.
- **Inheritance gotcha:** CSS variables inherit *already resolved*, so a Chalkboard preview inside a Neon page picked up Neon's glow until each look reset those variables itself.
- **Never colour alone:** in Chalkboard, White's and Black's chalk colours are similar in brightness, which is hard for colourblind players. So Black's pieces are filled and White's are outlined. Check is announced in words, and the low clock pulses as well as turning red.
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
- **Accounts (`src/lib/account/`):** a guest is upgraded with `linkWithCredential`, so the same user id keeps its game. Learn how account linking works.
- **Password storage:** Firebase stores only a *salted hash* (scrypt), never the password. Look up why hashing beats encryption for passwords, and what a salt is.
- **Email-enumeration protection:** "wrong email or password" is deliberately vague, and "reset link sent" is shown even for unknown emails. Otherwise attackers could test which emails have accounts.
- **Uniqueness with an index document:** `usernames/{name}` points to its owner. Claiming a name creates that doc inside a transaction, so two people can't take the same name at the same moment.
- **Anti-farming:** wins need a verified email, a real opponent and 10+ moves (`winnerToCredit` in `game-doc.ts`). Think about what else a cheater could try.
- **Defence in depth:** client checks (nice error messages) plus server checks (the real protection) plus database rules (the last wall). Never rely on the client alone.
- Still to add: App Check / reCAPTCHA against bots, restricting the web API key to the site's domain.

## 9. The bot: search + learning

The bot has two halves: **search** (looking ahead) and **evaluation** (judging a position). Read `search.ts` and `evaluate.ts` side by side.

- **Minimax / negamax:** I pick the move that's best for me assuming you reply with the move that's best for you, and so on. Negamax is the same idea written once: my score = −(your best score).
- **Alpha–beta pruning:** skip lines that can't change the decision. With good move ordering it searches roughly the square root of the positions minimax would, so it sees about twice as deep in the same time.
- **Move ordering:** try captures first (most valuable victim, least valuable attacker), then "killer moves" that refuted other lines at the same depth.
- **Quiescence search:** never stop thinking in the middle of a trade. At the horizon, keep looking at captures only. Without it, bots make "horizon effect" blunders.
- **Iterative deepening:** search depth 1, then 2, then 3… until time runs out, always keeping the last finished answer. That's how Hard thinks for "about 1.5 seconds" instead of a fixed depth.
- **Check extensions and mate scores:** look one move deeper when in check, and score mate as a huge number minus the distance, so the bot prefers faster mates.
- **Make/unmake on a mutable board** (`board.ts`) instead of copying the board for each move, which is much faster. Because it duplicates the rules, a test checks it against `engine.ts` in over 1,000 random positions.
- **Bit packing:** a move is one number (`from | to << 6 | captured << 12`). Learn bitwise operators.
- **Evaluation:** material (piece values), mobility (a piece on a square where it reaches more squares scores more), king danger (enemy attacks next to your king), and "mop-up" (when ahead, push the enemy king to the edge).
- **Starting piece values:** each piece is worth 45 × the average number of squares it can reach. It's a guess based on mobility, and training then corrects it.
- **Training by self-play (`scripts/train-bot.ts`):** the bot plays thousands of games against itself, saves positions with the final result, and fits the weights with **logistic regression** so the evaluation predicts who wins (Texel tuning, used by real chess engines). A first attempt used **SPSA** (nudge all weights randomly, let the two versions play, step toward the winner).
- **What actually happened, and why it's a lesson:** at first neither method beat the starting guess (about 50% in 200-game checks). Measuring *how games end* showed why: 90%+ of games between careful bots ended by the 50-moves-without-capture rule, even at depth 6. You can't learn who wins from games nobody wins. Always check that your training data has signal before tuning a model: look at the label distribution first.
- **After the rule change:** 73% of self-play games were decisive, and Texel tuning on 22,065 positions gave weights that beat the untrained ones **58% of the time** over 200 unseen boards. The learned values say √5 (the knight) is the strongest piece and √2 much weaker than its mobility suggested. The held-out loss fell along with the training loss, a sign it learned rather than memorised.
- **The fix was a game-design change, found by simulation:** several rule variants were each tested over 40 bot-vs-bot games: fairer setups (3% decisive), bare king (8%), 16 pieces (48%, all checkmates), maths points (98%, nearly all on points), and **16 pieces + maths points (100%, about half checkmates)**. The last one was picked. Using simulations to balance a game before players see it is standard practice in game design.
- **A second balance problem, found by a test that looked broken:** an end-to-end test kept timing out because the bot checkmated it on move 2. With 16 pieces packed into two rows, each king was fully boxed in, so any uncapturable check was instant mate: White could mate on move 1 in 35.7% of setups. Measuring fixes showed one empty square in front of each king takes that to 0%. It also showed that many earlier "checkmates" had been these cheap opening mates (checkmates went from 62% to about 30% of games).
- **Floating-point care:** maths points compare sums of square roots, which computers can't store exactly (√2 is irrational), so equality uses a tiny tolerance (`1e-9`) instead of `===`.
- **Validation discipline:** new weights are only saved if they beat the old ones in matches on boards never used in training (a train/validation split). That safeguard is why no worse weights were shipped.
- **Measuring strength:** `npm run bot:levels` plays the levels against each other and reports wins, draws and losses, not just a score, because draws can hide differences.
- **Difficulty levels:** Easy judges only its own move (never your reply) and plays randomly 30% of the time; Medium looks 2 moves ahead; Hard deepens for 1.5 s. Easy was tuned against a scripted "greedy beginner" (takes the biggest capture, otherwise random) until the beginner won more often. The first Easy was too strong because it still checked for recaptures. Making a bot *weaker* on purpose, in a human-feeling way, is its own design problem.
- **Web Workers:** `bot.worker.ts` runs the search in a background thread so the page doesn't freeze.
- Going further: transposition tables and Zobrist hashing, Monte Carlo Tree Search, and neural-network evaluation (AlphaZero, NNUE).

## 10. Tools and workflow

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
6. Algorithms → read `src/lib/bot/search.ts`, then try changing a weight and re-running `npm run bot:levels`.
